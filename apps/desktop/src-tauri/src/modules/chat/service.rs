use super::commands::{ChatProgress, CreatedFile, SendMessageRequest, SendMessageResponse};
use crate::core::error::AppError;
use crate::modules::tools::registry;
use crate::modules::{
    ai::{
        config::ProviderConfig,
        error::LlmError,
        factory::ProviderFactory,
        request::{LlmMessage, LlmRequest, LlmRole},
    },
    conversation::{
        db,
        model::{ConversationMessage, MessageRole, MessageStatus},
    },
};
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

pub struct ChatService {
    provider_factory: Arc<ProviderFactory>,
}

impl ChatService {
    pub fn new(provider_factory: Arc<ProviderFactory>) -> Self {
        Self { provider_factory }
    }

    pub async fn send_message(
        &self,
        pool: &SqlitePool,
        app: &AppHandle,
        request: SendMessageRequest,
    ) -> Result<SendMessageResponse, AppError> {
        if request.content.trim().is_empty() {
            return Err(AppError::Ai("Message content cannot be empty".into()));
        }
        if !db::project_exists(pool, &request.project_id).await? {
            return Err(AppError::Ai("Project not found".into()));
        }

        let (conversation_id, should_generate_title) = match request.conversation_id.as_ref() {
            Some(id) => {
                let conversation = db::conversation(pool, &request.project_id, id).await?;
                (id.clone(), conversation.title == "New conversation")
            }
            None => (self.create_conversation(pool, &request).await?, true),
        };
        let _user_message = self
            .persist_message(
                pool,
                &request.project_id,
                &conversation_id,
                MessageRole::User,
                request.content.trim(),
                MessageStatus::Completed,
                None,
                request.model.as_deref(),
            )
            .await?;

        let provider_config = self
            .resolve_provider(pool, &conversation_id, &request)
            .await?;
        let model = request
            .model
            .clone()
            .or(Some(provider_config.model.clone()))
            .ok_or_else(|| AppError::Ai(LlmError::ModelNotConfigured.safe_message()))?;
        sqlx::query("UPDATE conversations SET provider_config_id = ?, model = ? WHERE id = ? AND project_id = ?")
            .bind(&provider_config.id)
            .bind(&model)
            .bind(&conversation_id)
            .bind(&request.project_id)
            .execute(pool)
            .await?;
        let history = db::messages(pool, &conversation_id, 100, 0).await?;
        let mut messages = vec![LlmMessage {
            role: LlmRole::System,
            content: "You are Brainstorm, an AI knowledge workspace. Use search.query for vault search, markdown tools to inspect Markdown, vault tools to create or modify files and folders, and web.fetch for external content. For every Markdown (.md) file, include non-empty YAML frontmatter fields name, author, created, and updated. Add other Markdown properties intelligently when relevant to the document: type, domain, status, tags, aliases, links, summary, icon, favorite, priority, description, published, and optional cover/contributors/custom fields. Use typed YAML values, YYYY-MM-DD dates, block lists, and a blank line after the closing --- before the Markdown body. Never put frontmatter fields in the body. Use tools when necessary. Never claim a file was created or changed unless the corresponding tool succeeded.".into(),
            tool_call_id: None,
            tool_calls: vec![],
        }];
        messages.extend(history.into_iter().map(|message| {
            let (content, tool_call_id, tool_calls) = match message.role.as_str() {
                "assistant" if message.content.starts_with("[tool_calls] ") => (
                    String::new(),
                    None,
                    serde_json::from_str(message.content.trim_start_matches("[tool_calls] "))
                        .unwrap_or_default(),
                ),
                "tool" if message.content.starts_with("[tool_result] ") => {
                    let result: Option<crate::modules::ai::ToolResult> =
                        serde_json::from_str(message.content.trim_start_matches("[tool_result] "))
                            .ok();
                    (
                        result
                            .as_ref()
                            .map(|item| item.result.to_string())
                            .unwrap_or(message.content),
                        result.map(|item| item.tool_call_id),
                        vec![],
                    )
                }
                _ => (message.content, None, vec![]),
            };
            LlmMessage {
                role: match message.role.as_str() {
                    "assistant" => LlmRole::Assistant,
                    "system" => LlmRole::System,
                    "tool" => LlmRole::Tool,
                    _ => LlmRole::User,
                },
                content,
                tool_call_id,
                tool_calls,
            }
        }));
        let llm_request = LlmRequest {
            model: model.clone(),
            messages,
            tools: registry::definitions()
                .into_iter()
                .map(|tool| crate::modules::ai::ToolDefinition {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.input_schema,
                })
                .collect(),
            temperature: None,
            max_tokens: None,
        };
        let provider = self
            .provider_factory
            .create(&provider_config)
            .await
            .map_err(|error| AppError::Ai(error.safe_message()))?;

        if should_generate_title {
            let title_request = LlmRequest {
                model: model.clone(),
                messages: vec![
                    LlmMessage { role: LlmRole::System, content: "Generate a useful conversation title from the user's message. Return ONLY the final title: 2 to 6 natural words, title case, no quotes, punctuation, markdown, XML tags, reasoning, prefixes, or explanation. Never output <think> or analysis. Example: Create Markdown Note.".into(), tool_call_id: None, tool_calls: vec![] },
                    LlmMessage { role: LlmRole::User, content: request.content.trim().into(), tool_call_id: None, tool_calls: vec![] },
                ],
                tools: vec![],
                temperature: Some(0.2),
                max_tokens: Some(20),
            };
            let title = match provider.generate(title_request).await {
                Ok(response) => normalize_title(&response.content, request.content.trim()),
                Err(_) => fallback_title(request.content.trim()),
            };
            sqlx::query("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND project_id = ?")
                .bind(title)
                .bind(now())
                .bind(&conversation_id)
                .bind(&request.project_id)
                .execute(pool)
                .await?;
        }

        let project_path: String = sqlx::query_scalar("SELECT path FROM projects WHERE id = ?")
            .bind(&request.project_id)
            .fetch_one(pool)
            .await?;
        let mut round_request = llm_request;
        let mut assistant_content = String::new();
        let mut failed_tool_attempts = std::collections::HashMap::<String, usize>::new();
        let mut last_tool_results = Vec::<crate::modules::ai::ToolResult>::new();
        let mut created_files = Vec::<CreatedFile>::new();
        let started_at = now();
        let mut working_steps = Vec::<ChatProgress>::new();
        for _ in 0..10 {
            working_steps.push(ChatProgress {
                phase: "thinking".into(),
                tool_name: None,
            });
            eprintln!("[chat] generation round conversation={}", conversation_id);
            let _ = app.emit(
                "chat-stream",
                super::commands::ChatStreamEvent {
                    conversation_id: conversation_id.clone(),
                    message_id: String::new(),
                    delta: String::new(),
                    done: false,
                    message: None,
                    progress: Some(ChatProgress {
                        phase: "thinking".into(),
                        tool_name: None,
                    }),
                    created_files: None,
                },
            );
            let response = provider
                .generate(round_request.clone())
                .await
                .map_err(|error| {
                    eprintln!(
                        "[chat] provider failure conversation={} error={}",
                        conversation_id, error
                    );
                    AppError::Ai(error.safe_message())
                })?;
            eprintln!(
                "[chat] provider response conversation={} tool_calls={} content_chars={}",
                conversation_id,
                response.tool_calls.len(),
                response.content.chars().count()
            );
            if response.tool_calls.is_empty() {
                assistant_content = response.content;
                if assistant_content.trim().is_empty() && !last_tool_results.is_empty() {
                    assistant_content = summarize_tool_results(&last_tool_results);
                    eprintln!(
                        "[chat] empty final response; using tool-result summary conversation={}",
                        conversation_id
                    );
                }
                break;
            }
            last_tool_results.clear();
            let tool_call_summary =
                serde_json::to_string(&response.tool_calls).unwrap_or_else(|_| "[]".into());
            self.persist_message(
                pool,
                &request.project_id,
                &conversation_id,
                MessageRole::Assistant,
                &format!("[tool_calls] {tool_call_summary}"),
                MessageStatus::Completed,
                Some(&provider_config.provider_id),
                Some(&model),
            )
            .await?;
            round_request.messages.push(LlmMessage {
                role: LlmRole::Assistant,
                content: response.content,
                tool_call_id: None,
                tool_calls: response.tool_calls.clone(),
            });
            for call in response.tool_calls {
                working_steps.push(ChatProgress {
                    phase: "calling_tool".into(),
                    tool_name: Some(call.name.clone()),
                });
                let _ = app.emit(
                    "chat-stream",
                    super::commands::ChatStreamEvent {
                        conversation_id: conversation_id.clone(),
                        message_id: String::new(),
                        delta: String::new(),
                        done: false,
                        message: None,
                        progress: Some(ChatProgress {
                            phase: "calling_tool".into(),
                            tool_name: Some(call.name.clone()),
                        }),
                        created_files: None,
                    },
                );
                let result = super::tools::execute(&call, &project_path).await;
                let tool_result = match result {
                    Ok(value) => crate::modules::ai::ToolResult {
                        tool_call_id: call.id.clone(),
                        name: call.name.clone(),
                        result: value,
                        success: true,
                    },
                    Err(error) => {
                        eprintln!(
                            "[chat] tool result error conversation={} tool={} error={}",
                            conversation_id, call.name, error
                        );
                        crate::modules::ai::ToolResult {
                            tool_call_id: call.id.clone(),
                            name: call.name.clone(),
                            result: json!({"error": error.to_string()}),
                            success: false,
                        }
                    }
                };
                if tool_result.success && call.name == "vault.create_file" {
                    if let Some(path) = tool_result.result["path"].as_str() {
                        created_files.push(CreatedFile {
                            path: path.into(),
                            name: path.rsplit('/').next().unwrap_or(path).into(),
                        });
                    }
                }
                if !tool_result.success {
                    let attempt_key = format!("{}:{}", call.name, call.arguments);
                    let attempts = failed_tool_attempts.entry(attempt_key).or_default();
                    *attempts += 1;
                    if *attempts >= 2 {
                        return Err(AppError::Ai(format!(
                            "Tool {} failed repeatedly: {}",
                            call.name, tool_result.result
                        )));
                    }
                }
                last_tool_results.push(tool_result.clone());
                working_steps.push(ChatProgress {
                    phase: "tool_completed".into(),
                    tool_name: Some(call.name.clone()),
                });
                let content =
                    serde_json::to_string(&tool_result.result).unwrap_or_else(|_| "{}".into());
                let persisted_result =
                    serde_json::to_string(&tool_result).unwrap_or_else(|_| "{}".into());
                self.persist_message(
                    pool,
                    &request.project_id,
                    &conversation_id,
                    MessageRole::Tool,
                    &format!("[tool_result] {persisted_result}"),
                    MessageStatus::Completed,
                    Some(&provider_config.provider_id),
                    Some(&model),
                )
                .await?;
                round_request.messages.push(LlmMessage {
                    role: LlmRole::Tool,
                    content,
                    tool_call_id: Some(call.id),
                    tool_calls: vec![],
                });
                let _ = app.emit(
                    "chat-stream",
                    super::commands::ChatStreamEvent {
                        conversation_id: conversation_id.clone(),
                        message_id: String::new(),
                        delta: String::new(),
                        done: false,
                        message: None,
                        progress: Some(ChatProgress {
                            phase: "tool_completed".into(),
                            tool_name: Some(call.name),
                        }),
                        created_files: None,
                    },
                );
            }
        }
        if assistant_content.is_empty() {
            assistant_content = if last_tool_results.is_empty() {
                "I could not generate a response.".into()
            } else {
                summarize_tool_results(&last_tool_results)
            };
        }
        let assistant_id = uuid::Uuid::new_v4().to_string();
        let run_metadata = serde_json::json!({
            "workingHistory": {
                "startedAt": started_at * 1000,
                "durationMs": (now() - started_at).max(0) * 1000,
                "completedAt": now() * 1000,
                "steps": working_steps,
            },
            "createdFiles": created_files,
        });
        let created_at = now();
        sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&assistant_id).bind(&conversation_id).bind(MessageRole::Assistant.as_str()).bind("").bind(MessageStatus::Streaming.as_str()).bind(&provider_config.provider_id).bind(&model).bind(created_at).execute(pool).await?;
        sqlx::query("UPDATE conversation_messages SET metadata = ? WHERE id = ?")
            .bind(run_metadata.to_string())
            .bind(&assistant_id)
            .execute(pool)
            .await?;
        let _ = app.emit(
            "chat-stream",
            super::commands::ChatStreamEvent {
                conversation_id: conversation_id.clone(),
                message_id: assistant_id.clone(),
                delta: assistant_content.clone(),
                done: false,
                message: None,
                progress: None,
                created_files: None,
            },
        );
        let assistant = ConversationMessage {
            id: assistant_id,
            conversation_id: conversation_id.clone(),
            role: MessageRole::Assistant,
            content: assistant_content,
            status: MessageStatus::Completed,
            provider: Some(provider_config.provider_id.clone()),
            model: Some(model.clone()),
            created_at,
            updated_at: Some(now()),
            metadata: Some(run_metadata),
        };
        db::update_message_content(
            pool,
            &assistant.id,
            &assistant.content,
            MessageStatus::Completed.as_str(),
        )
        .await?;
        sqlx::query("UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ? AND project_id = ?").bind(now()).bind(now()).bind(&conversation_id).bind(&request.project_id).execute(pool).await?;
        let _ = app.emit(
            "chat-stream",
            super::commands::ChatStreamEvent {
                conversation_id: conversation_id.clone(),
                message_id: assistant.id.clone(),
                delta: String::new(),
                done: true,
                message: Some(assistant.clone()),
                progress: None,
                created_files: Some(created_files),
            },
        );
        Ok(SendMessageResponse {
            conversation_id,
            message: assistant,
        })
    }

    async fn create_conversation(
        &self,
        pool: &SqlitePool,
        request: &SendMessageRequest,
    ) -> Result<String, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = now();
        sqlx::query("INSERT INTO conversations (id, project_id, title, provider_config_id, model, created_at, updated_at, archived) VALUES (?, ?, 'New conversation', ?, ?, ?, ?, 0)").bind(&id).bind(&request.project_id).bind(&request.provider_config_id).bind(&request.model).bind(timestamp).bind(timestamp).execute(pool).await?;
        Ok(id)
    }

    async fn resolve_provider(
        &self,
        pool: &SqlitePool,
        conversation_id: &str,
        request: &SendMessageRequest,
    ) -> Result<ProviderConfig, AppError> {
        if let Some(provider_id) = request.provider_config_id.as_deref() {
            return sqlx::query_as::<_, ProviderConfig>("SELECT id, provider_id, name, model, base_url, credential_id, created_at, updated_at FROM llm_provider_configs WHERE id = ?")
                .bind(provider_id)
                .fetch_optional(pool)
                .await?
                .ok_or_else(|| AppError::Ai(LlmError::ProviderNotConfigured.safe_message()));
        }
        let conversation = sqlx::query_as::<_, ProviderConfig>("SELECT pc.id, pc.provider_id, pc.name, pc.model, pc.base_url, pc.credential_id, pc.created_at, pc.updated_at FROM llm_provider_configs pc JOIN conversations c ON c.provider_config_id = pc.id WHERE c.id = ?").bind(conversation_id).fetch_optional(pool).await?;
        if let Some(config) = conversation {
            return Ok(config);
        }
        Err(AppError::Ai(LlmError::ProviderNotConfigured.safe_message()))
    }

    async fn persist_message(
        &self,
        pool: &SqlitePool,
        project_id: &str,
        conversation_id: &str,
        role: MessageRole,
        content: &str,
        status: MessageStatus,
        provider: Option<&str>,
        model: Option<&str>,
    ) -> Result<ConversationMessage, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = now();
        sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(&id).bind(conversation_id).bind(role.as_str()).bind(content).bind(status.as_str()).bind(provider).bind(model).bind(timestamp).execute(pool).await?;
        sqlx::query("UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ? AND project_id = ?").bind(timestamp).bind(timestamp).bind(conversation_id).bind(project_id).execute(pool).await?;
        sqlx::query("UPDATE projects SET last_conversation_id = ?, updated_at = ? WHERE id = ?")
            .bind(conversation_id)
            .bind(timestamp)
            .bind(project_id)
            .execute(pool)
            .await?;
        Ok(ConversationMessage {
            id,
            conversation_id: conversation_id.into(),
            role,
            content: content.into(),
            status,
            provider: provider.map(str::to_owned),
            model: model.map(str::to_owned),
            created_at: timestamp,
            updated_at: None,
            metadata: None,
        })
    }
}

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default()
}

fn normalize_title(value: &str, source: &str) -> String {
    let without_reasoning = strip_reasoning_blocks(value);
    let title = without_reasoning
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or_default()
        .trim_matches('"')
        .trim_matches('\'')
        .trim_matches('`')
        .trim_start_matches(|character: char| {
            character == '-' || character == '*' || character == '#'
        })
        .trim();
    let title = title
        .strip_prefix("Title:")
        .or_else(|| title.strip_prefix("TITLE:"))
        .unwrap_or(title)
        .trim()
        .replace(['\n', '\r'], " ");
    let title = title.split_whitespace().collect::<Vec<_>>().join(" ");
    if title.is_empty() {
        fallback_title(source)
    } else {
        let shortened: String = title.chars().take(80).collect();
        if shortened.chars().count() < 2 {
            fallback_title(source)
        } else {
            shortened
        }
    }
}

fn strip_reasoning_blocks(value: &str) -> String {
    let mut result = value.to_owned();
    for tag in ["think", "analysis", "reasoning"] {
        let open = format!("<{tag}>");
        let close = format!("</{tag}>");
        while let Some(start) = result.to_ascii_lowercase().find(&open) {
            let remainder = &result[start + open.len()..];
            let Some(end) = remainder.to_ascii_lowercase().find(&close) else {
                result.truncate(start);
                break;
            };
            result.replace_range(start..start + open.len() + end + close.len(), "");
        }
    }
    result
}

fn fallback_title(source: &str) -> String {
    let title = strip_reasoning_blocks(source)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let shortened: String = title.chars().take(60).collect();
    if shortened.is_empty() {
        "New conversation".into()
    } else if title.chars().count() > 60 {
        format!("{shortened}…")
    } else {
        shortened
    }
}

#[cfg(test)]
mod title_tests {
    use super::{fallback_title, normalize_title};

    #[test]
    fn normalize_title_removes_model_reasoning() {
        assert_eq!(
            normalize_title(
                "<think>Analyze the request</think>Create Markdown Note",
                "make a markdown note"
            ),
            "Create Markdown Note"
        );
    }

    #[test]
    fn normalize_title_falls_back_when_response_is_only_reasoning() {
        assert_eq!(
            normalize_title(
                "<think>Analyze the request</think>",
                "Create a project plan"
            ),
            "Create a project plan"
        );
    }

    #[test]
    fn fallback_title_collapses_long_input() {
        assert_eq!(
            fallback_title("Plan the next product launch"),
            "Plan the next product launch"
        );
    }
}

fn summarize_tool_results(results: &[crate::modules::ai::ToolResult]) -> String {
    results
        .iter()
        .map(|result| {
            if result.success {
                match result.name.as_str() {
                    "vault.create_file" => format!(
                        "Created `{}`.",
                        result.result["path"].as_str().unwrap_or("the file")
                    ),
                    "vault.create_folder" => format!(
                        "Created folder `{}`.",
                        result.result["path"].as_str().unwrap_or("the folder")
                    ),
                    "vault.exists" => {
                        if result.result["exists"].as_bool() == Some(true) {
                            format!(
                                "`{}` already exists.",
                                result.result["path"].as_str().unwrap_or("The path")
                            )
                        } else {
                            format!(
                                "`{}` does not exist.",
                                result.result["path"].as_str().unwrap_or("The path")
                            )
                        }
                    }
                    _ => format!("Completed `{}`.", result.name),
                }
            } else {
                let error = result.result["error"].as_str().unwrap_or("the tool failed");
                format!("I couldn't complete `{}`: {}", result.name, error)
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
