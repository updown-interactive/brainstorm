use super::commands::{
    ChatMode, GenerateKnowledgeRequest, KnowledgeDraft, SendMessageRequest, SendMessageResponse,
    WorkingStep, WorkingTrace,
};
use crate::core::error::AppError;
use crate::modules::{
    ai::{
        config::ProviderConfig,
        error::LlmError,
        factory::ProviderFactory,
        request::{LlmMessage, LlmRequest, LlmRole},
    },
    context::{ContextManager, ContextRequest},
    conversation::{
        db,
        model::{ConversationMessage, MessageRole, MessageStatus},
    },
};
use futures_util::StreamExt;
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

    pub async fn generate_knowledge(
        &self,
        pool: &SqlitePool,
        request: GenerateKnowledgeRequest,
    ) -> Result<KnowledgeDraft, AppError> {
        let provider_id = request.provider_config_id.as_deref().ok_or_else(|| {
            AppError::Ai("Select an AI provider before creating knowledge.".into())
        })?;
        let config = sqlx::query_as::<_, ProviderConfig>("SELECT id, provider_id, name, model, base_url, credential_id, created_at, updated_at FROM llm_provider_configs WHERE id = ?")
            .bind(provider_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::Ai(LlmError::ProviderNotConfigured.safe_message()))?;
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| config.model.clone());
        let provider = self
            .provider_factory
            .create(&config)
            .await
            .map_err(|error| AppError::Ai(error.safe_message()))?;
        let tool_context = read_markdown_tool_context(&request.project_path);
        let system = format!("You are Brainstorm's knowledge creation engine. Take the assistant response and elaborate it into highly detailed, self-contained knowledge notes using normal Markdown syntax. The body must be only the knowledge article—not a report about formatting and not a catalog of Markdown features. Before generating, study the complete Markdown tool package below. Use EXAMPLES.md only to learn syntax and frontmatter conventions; do not copy its demonstration sections or its catalog of Markdown features into the document. RULES.md, SCHEMAS.md, SKILLS.md, README.md, tool.yaml, manifest.yaml, INPUT_SCHEMA.json, and OUTPUT_SCHEMA.json define the constraints.\n\n--- Markdown tool package ---\n{tool_context}\n--- End Markdown tool package ---\n\nGenerate the final document as Markdown with YAML frontmatter at byte 0. The LLM must generate the title, semantic properties, tags, and article body. The application will set only created and updated. Put tags only in YAML frontmatter; never write tags or metadata as body sections. The body must be a detailed article about the source response: one `#` title, meaningful `##` sections, explanations, examples, and lists only where useful. Never add sections named Tags, Body, Headings, Links, Footnotes, Table, Code Block, or Markdown Features. Never duplicate the article or describe the Markdown structure. Remove personal anecdotes, conversational questions, and references to the assistant's internal search/process. Return only the Markdown document, with no commentary or code fences.");
        let response = generate_knowledge_document(
            provider.as_ref(),
            &model,
            &system,
            &request.title,
            &request.response,
        )
        .await?;
        let response_preview = response.content.chars().take(600).collect::<String>();
        eprintln!(
            "[KnowledgeEngine] provider response length={} preview={:?}",
            response.content.len(),
            response_preview
        );
        let mut draft = parse_knowledge_draft(&response.content)?;
        if !has_markdown_structure(&draft.content) || has_knowledge_artifacts(&draft.content) {
            let repair = provider
                .generate(LlmRequest {
                    model: config.model.clone(),
                    messages: vec![
                        LlmMessage {
                            role: LlmRole::System,
                            content: "Rewrite the supplied text as a concise, self-contained Markdown knowledge article. Return ONLY the article body. Do not include YAML frontmatter, metadata, tags sections, headings indexes, links indexes, footnotes indexes, table indexes, code-block demonstrations, or labels such as `Body`, `Tags`, `Headings`, `Links`, `Table`, or `Code Block`. Do not duplicate the article. Use a single # title, meaningful ## sections, explanatory paragraphs, and lists only when they improve the explanation. Remove conversational filler, personal anecdotes, questions, and references to AI/search processes.".into(),
                        },
                        LlmMessage {
                            role: LlmRole::User,
                            content: draft.content.clone(),
                        },
                    ],
                    tools: vec![],
                    temperature: Some(0.2),
                    max_tokens: Some(1000),
                })
                .await;
            if let Ok(repair) = repair {
                if !repair.content.trim().is_empty() {
                    draft.content = repair.content.trim().to_string();
                }
            }
        }
        draft.content = strip_knowledge_artifact_sections(&draft.content);
        eprintln!(
            "[KnowledgeEngine] generating concise semantic metadata for title={:?}",
            draft.title
        );
        match generate_knowledge_properties(
            provider.as_ref(),
            &model,
            &tool_context,
            &draft.title,
            &draft.content,
        )
        .await
        {
            Ok(properties) => draft.properties = properties,
            Err(error) if !has_knowledge_properties(&draft.properties) => {
                eprintln!(
                    "[KnowledgeEngine] metadata generation failed; using emergency properties: {}",
                    error
                );
                let original_properties = draft.properties.clone();
                draft.properties = emergency_knowledge_properties(&draft.title, &draft.content);
                preserve_knowledge_links(&original_properties, &mut draft.properties);
            }
            Err(error) => {
                eprintln!(
                    "[KnowledgeEngine] metadata regeneration failed; retaining document properties: {}",
                    error
                );
            }
        }
        if let Some(properties) = draft.properties.as_object() {
            eprintln!(
                "[KnowledgeEngine] generated property keys={:?}",
                properties.keys().collect::<Vec<_>>()
            );
        }
        normalize_knowledge_properties(&mut draft.properties, &draft.title);
        remove_redundant_knowledge_properties(&mut draft.properties);
        if let Some(name) = draft
            .properties
            .get("name")
            .and_then(serde_json::Value::as_str)
        {
            draft.title = name.to_owned();
        }
        let today = now_date();
        if let Some(properties) = draft.properties.as_object_mut() {
            properties.insert("created".into(), serde_json::Value::String(today.clone()));
            properties.insert("updated".into(), serde_json::Value::String(today));
        }
        if draft.title.trim().is_empty() {
            draft.title = request.title.trim().to_string();
        }
        Ok(draft)
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
        let provider = self
            .provider_factory
            .create(&provider_config)
            .await
            .map_err(|error| AppError::Ai(error.safe_message()))?;
        let project_path =
            sqlx::query_scalar::<_, String>("SELECT path FROM projects WHERE id = ?")
                .bind(&request.project_id)
                .fetch_one(pool)
                .await?;
        let context = ContextManager::assemble(
            pool,
            provider.as_ref(),
            ContextRequest {
                conversation_id: &conversation_id,
                project_path: &project_path,
                provider_id: &provider_config.provider_id,
                model: &model,
                system_instruction: mode_instructions(&request.mode),
                query: request.content.trim(),
                tools: &[],
            },
        )
        .await?;
        let llm_request = LlmRequest {
            model: model.clone(),
            messages: context.messages,
            tools: vec![],
            temperature: None,
            max_tokens: Some(context.usage.reserved_output_tokens.saturating_sub(1_024) as u32),
        };
        let mut working = WorkingTrace {
            working_type: if context.knowledge_context.is_some() {
                "knowledge_grounded".into()
            } else {
                "general_generation".into()
            },
            status: "working".into(),
            steps: vec![
                WorkingStep {
                    id: "search_knowledge_base".into(),
                    label: "Search knowledge base".into(),
                    status: "completed".into(),
                },
                WorkingStep {
                    id: "build_context".into(),
                    label: "Build response context".into(),
                    status: "completed".into(),
                },
                WorkingStep {
                    id: "generate_response".into(),
                    label: "Generate response".into(),
                    status: "working".into(),
                },
            ],
            started_at: now(),
            completed_at: None,
        };
        let initial_metadata = serde_json::json!({
            "knowledge": context.knowledge_context,
            "working": working,
        });
        eprintln!(
            "[Chat] provider request conversation_id={} provider={} endpoint={} model={} input_messages={} kb_results={} kb_context_tokens={} max_tokens={:?}",
            conversation_id,
            provider_config.provider_id,
            provider_config.base_url.as_deref().unwrap_or("<missing>"),
            model,
            llm_request.messages.len(),
            context.knowledge_context.as_ref().map(|value| value.results.len()).unwrap_or_default(),
            context.usage.knowledge_context_tokens,
            llm_request.max_tokens
        );

        if should_generate_title {
            let title_request = LlmRequest {
                model: model.clone(),
                messages: vec![
                    LlmMessage { role: LlmRole::System, content: "Create a concise title for this conversation. Return only the title, with no quotes or explanation. Keep it under six words.".into() },
                    LlmMessage { role: LlmRole::User, content: request.content.trim().into() },
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

        let mut stream = provider
            .stream(llm_request)
            .await
            .map_err(|error| AppError::Ai(error.safe_message()))?;
        let assistant_id = uuid::Uuid::new_v4().to_string();
        let mut assistant_content = String::new();
        let created_at = now();
        sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&assistant_id).bind(&conversation_id).bind(MessageRole::Assistant.as_str()).bind("").bind(MessageStatus::Streaming.as_str()).bind(&provider_config.provider_id).bind(&model).bind(created_at).bind(initial_metadata.to_string()).execute(pool).await?;
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(delta) => {
                    assistant_content.push_str(&delta);
                    db::update_message_content(
                        pool,
                        &assistant_id,
                        &assistant_content,
                        MessageStatus::Streaming.as_str(),
                    )
                    .await?;
                    let _ = app.emit(
                        "chat-stream",
                        super::commands::ChatStreamEvent {
                            conversation_id: conversation_id.clone(),
                            message_id: assistant_id.clone(),
                            delta,
                            done: false,
                            message: None,
                            knowledge: None,
                            working: Some(working.clone()),
                        },
                    );
                }
                Err(error) => {
                    let message = "Unable to generate a response. Check your provider configuration and try again.";
                    db::update_message_content(
                        pool,
                        &assistant_id,
                        message,
                        MessageStatus::Failed.as_str(),
                    )
                    .await?;
                    let failed_message = ConversationMessage {
                        id: assistant_id.clone(),
                        conversation_id: conversation_id.clone(),
                        role: MessageRole::Assistant,
                        content: message.into(),
                        status: MessageStatus::Failed,
                        provider: Some(provider_config.provider_id.clone()),
                        model: Some(model.clone()),
                        created_at,
                        updated_at: Some(now()),
                        metadata: None,
                    };
                    let _ = app.emit(
                        "chat-stream",
                        super::commands::ChatStreamEvent {
                            conversation_id: conversation_id.clone(),
                            message_id: assistant_id,
                            delta: String::new(),
                            done: true,
                            message: Some(failed_message),
                            knowledge: None,
                            working: None,
                        },
                    );
                    return Err(AppError::Ai(error.safe_message()));
                }
            }
        }
        if assistant_content.trim().is_empty() {
            let message = "The provider returned an empty response. Check the selected model and provider configuration.";
            db::update_message_content(
                pool,
                &assistant_id,
                message,
                MessageStatus::Failed.as_str(),
            )
            .await?;
            eprintln!(
                "[Chat] provider returned an empty response conversation_id={} provider={} model={}",
                conversation_id, provider_config.provider_id, model
            );
            let failed_message = ConversationMessage {
                id: assistant_id.clone(),
                conversation_id: conversation_id.clone(),
                role: MessageRole::Assistant,
                content: message.into(),
                status: MessageStatus::Failed,
                provider: Some(provider_config.provider_id.clone()),
                model: Some(model.clone()),
                created_at,
                updated_at: Some(now()),
                metadata: None,
            };
            let _ = app.emit(
                "chat-stream",
                super::commands::ChatStreamEvent {
                    conversation_id: conversation_id.clone(),
                    message_id: assistant_id,
                    delta: String::new(),
                    done: true,
                    message: Some(failed_message),
                    knowledge: None,
                    working: None,
                },
            );
            return Err(AppError::Ai(message.into()));
        }
        working.status = "completed".into();
        working.completed_at = Some(now());
        if let Some(step) = working
            .steps
            .iter_mut()
            .find(|step| step.id == "generate_response")
        {
            step.status = "completed".into();
        }
        let message_metadata = serde_json::json!({
            "working": working,
            "knowledge": context.knowledge_context,
        });
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
            metadata: Some(message_metadata.clone()),
        };
        db::update_message_content(
            pool,
            &assistant.id,
            &assistant.content,
            MessageStatus::Completed.as_str(),
        )
        .await?;
        db::update_message_metadata(pool, &assistant.id, &message_metadata).await?;
        sqlx::query("UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ? AND project_id = ?").bind(now()).bind(now()).bind(&conversation_id).bind(&request.project_id).execute(pool).await?;
        let _ = app.emit(
            "chat-stream",
            super::commands::ChatStreamEvent {
                conversation_id: conversation_id.clone(),
                message_id: assistant.id.clone(),
                delta: String::new(),
                done: true,
                message: Some(assistant.clone()),
                knowledge: context.knowledge_context.clone(),
                working: Some(
                    serde_json::from_value(message_metadata["working"].clone()).map_err(
                        |error| AppError::Internal(format!("Invalid working trace: {error}")),
                    )?,
                ),
            },
        );
        Ok(SendMessageResponse {
            conversation_id,
            message: assistant,
            knowledge: context.knowledge_context,
            working: serde_json::from_value(message_metadata["working"].clone())
                .map_err(|error| AppError::Internal(format!("Invalid working trace: {error}")))?,
        })
    }

    async fn create_conversation(
        &self,
        pool: &SqlitePool,
        request: &SendMessageRequest,
    ) -> Result<String, AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = now();
        sqlx::query("INSERT INTO conversations (id, project_id, title, agent_id, provider_config_id, model, created_at, updated_at, archived) VALUES (?, ?, 'New conversation', NULL, ?, ?, ?, ?, 0)").bind(&id).bind(&request.project_id).bind(&request.provider_config_id).bind(&request.model).bind(timestamp).bind(timestamp).execute(pool).await?;
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
        sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)").bind(&id).bind(conversation_id).bind(role.as_str()).bind(content).bind(status.as_str()).bind(provider).bind(model).bind(timestamp).execute(pool).await?;
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

fn has_knowledge_properties(properties: &serde_json::Value) -> bool {
    let Some(properties) = properties.as_object() else {
        return false;
    };
    [
        "name", "author", "type", "domain", "status", "tags", "summary",
    ]
    .iter()
    .all(|key| properties.get(*key).is_some_and(|value| !value.is_null()))
}

async fn generate_knowledge_document(
    provider: &dyn crate::modules::ai::provider::LlmProvider,
    model: &str,
    system: &str,
    title: &str,
    source: &str,
) -> Result<crate::modules::ai::response::LlmResponse, AppError> {
    let mut last_error = None;
    for attempt in 1..=2 {
        eprintln!("[KnowledgeEngine] document generation attempt={attempt}");
        match provider
            .generate(LlmRequest {
                model: model.to_string(),
                messages: vec![
                    LlmMessage {
                        role: LlmRole::System,
                        content: system.to_string(),
                    },
                    LlmMessage {
                        role: LlmRole::User,
                        content: format!(
                            "Conversation title: {}\n\nAssistant response:\n{}",
                            title.trim(),
                            source.trim()
                        ),
                    },
                ],
                tools: vec![],
                temperature: Some(0.2),
                max_tokens: Some(1400),
            })
            .await
        {
            Ok(response) if !response.content.trim().is_empty() => return Ok(response),
            Ok(_) => {
                last_error = Some("provider returned an empty response".to_string());
            }
            Err(error) => {
                last_error = Some(error.safe_message());
                eprintln!(
                    "[KnowledgeEngine] document generation attempt={attempt} failed: {}",
                    last_error.as_deref().unwrap_or("unknown error")
                );
            }
        }
    }
    Err(AppError::Ai(format!(
        "Knowledge generation failed after retrying: {}",
        last_error.unwrap_or_else(|| "provider returned an invalid response".into())
    )))
}

fn has_knowledge_artifacts(content: &str) -> bool {
    let lower = content.to_ascii_lowercase();
    [
        "### tags",
        "### body",
        "### headings",
        "### links",
        "### footnotes",
        "### table",
        "### code block",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
}

fn strip_knowledge_artifact_sections(content: &str) -> String {
    let artifact_titles = [
        "tags",
        "body",
        "headings",
        "links",
        "footnotes",
        "table",
        "code block",
        "markdown features",
    ];
    let mut output = Vec::new();
    let mut skip = false;
    for line in content.lines() {
        let trimmed = line.trim();
        let heading = trimmed
            .strip_prefix("#")
            .map(|value| value.trim_start_matches('#').trim().to_ascii_lowercase());
        if let Some(title) = heading {
            if artifact_titles.iter().any(|artifact| title == *artifact) {
                skip = true;
                continue;
            }
            if skip && trimmed.starts_with('#') {
                skip = false;
            }
        }
        if !skip {
            output.push(line);
        }
    }
    output.join("\n").trim().to_string()
}

fn remove_redundant_knowledge_properties(properties: &mut serde_json::Value) {
    if let Some(properties) = properties.as_object_mut() {
        if properties.get("summary").is_some_and(|summary| {
            summary
                .as_str()
                .is_some_and(|value| !value.trim().is_empty())
        }) {
            properties.remove("description");
        }
    }
}

fn normalize_knowledge_properties(properties: &mut serde_json::Value, title: &str) {
    let Some(properties) = properties.as_object_mut() else {
        return;
    };
    let generated_name = properties
        .get("name")
        .and_then(serde_json::Value::as_str)
        .filter(|name| !name.trim().is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| title.to_owned());
    properties.remove("icon");
    properties.remove("aliases");
    properties.remove("priority");
    properties.insert(
        "name".into(),
        serde_json::Value::String(to_title_case(&generated_name)),
    );
    normalize_knowledge_tags(properties);
}

fn to_title_case(value: &str) -> String {
    let mut result = String::new();
    for (index, word) in value
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|word| !word.is_empty())
        .take(5)
        .enumerate()
    {
        let mut characters = word.chars();
        if let Some(first) = characters.next() {
            if index > 0 {
                result.push(' ');
            }
            result.push(first.to_ascii_uppercase());
            result.extend(characters.map(|character| character.to_ascii_lowercase()));
        }
    }
    if result.is_empty() {
        "Brainstorm Note".into()
    } else {
        result
    }
}

fn normalize_knowledge_tags(properties: &mut serde_json::Map<String, serde_json::Value>) {
    let Some(tags) = properties.get_mut("tags") else {
        return;
    };
    match tags {
        serde_json::Value::Array(values) => {
            for value in values {
                if let Some(tag) = value.as_str() {
                    *value = serde_json::Value::String(tag.to_lowercase());
                }
            }
        }
        serde_json::Value::String(tag) => {
            *tag = tag.to_lowercase();
        }
        _ => {}
    }
}

fn preserve_knowledge_links(original: &serde_json::Value, fallback: &mut serde_json::Value) {
    let Some(links) = original.get("links") else {
        return;
    };
    if !links.is_null() {
        if let Some(properties) = fallback.as_object_mut() {
            properties.entry("links").or_insert_with(|| links.clone());
        }
    }
}

fn emergency_knowledge_properties(title: &str, content: &str) -> serde_json::Value {
    let title = title.trim();
    let name = if title.is_empty() {
        "Brainstorm Note"
    } else {
        title
    };
    let normalized_name = to_title_case(name);
    let summary = content
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .unwrap_or("Knowledge note generated from the assistant response.");
    let tags = name
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|word| word.len() >= 3)
        .take(4)
        .map(|word| serde_json::Value::String(format!("#{}", word.to_lowercase())))
        .collect::<Vec<_>>();
    eprintln!(
        "[KnowledgeEngine] emergency properties generated from title; LLM metadata was unavailable"
    );
    serde_json::json!({
        "name": normalized_name,
        "author": "BrainStorm",
        "type": "documentation",
        "domain": "personal",
        "status": "active",
        "tags": tags,
        "summary": summary,
        "description": summary,
        "favorite": false
    })
}

async fn generate_knowledge_properties(
    provider: &dyn crate::modules::ai::provider::LlmProvider,
    model: &str,
    tool_context: &str,
    title: &str,
    content: &str,
) -> Result<serde_json::Value, AppError> {
    for attempt in 1..=2 {
        let response = provider
            .generate(LlmRequest {
                model: model.to_string(),
                messages: vec![
                    LlmMessage {
                        role: LlmRole::System,
                        content: format!(
                            "Generate valid knowledge-note properties. Study the Markdown tool package and EXAMPLES.md. Return ONLY one JSON object, beginning with {{ and ending with }}. Do not return Markdown, YAML, code fences, or explanation. The application supplies created and updated. Generate name, author, type, domain, status, tags, and summary. The name is the concise subject of the knowledge note, not the Markdown H1, not the source title, and not a sentence. Infer the subject and return a 2-5 word human-readable title with each word capitalized and spaces between words, for example Mammooty Indian Actor or African Elephant. Never copy a long heading such as “Mammooty: A Renowned Indian Film Actor and Producer” into name. Do not generate icon, aliases, or priority. Description is optional; prefer summary and do not generate both unless they contain genuinely different information. tags must be an array of concise lowercase strings. Use valid enum-like values such as type=documentation, domain=personal, status=active when appropriate.\n\nMarkdown tool package:\n{tool_context}"
                        ),
                    },
                    LlmMessage {
                        role: LlmRole::User,
                        content: format!("Title: {title}\n\nKnowledge body:\n{content}"),
                    },
                ],
                tools: vec![],
                temperature: Some(0.0),
                max_tokens: Some(600),
            })
            .await
            .map_err(|error| AppError::Ai(error.safe_message()))?;
        let raw = response.content.trim();
        eprintln!(
            "[KnowledgeEngine] metadata response attempt={} length={} preview={:?}",
            attempt,
            raw.len(),
            raw.chars().take(300).collect::<String>()
        );
        if let Some(properties) = parse_knowledge_properties(raw) {
            return Ok(properties);
        }
        if attempt == 1 {
            continue;
        }
    }
    Err(AppError::Ai(
        "The AI returned invalid knowledge properties after retrying. Please try again.".into(),
    ))
}

fn parse_knowledge_properties(raw: &str) -> Option<serde_json::Value> {
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```yaml")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let candidates = [
        cleaned,
        cleaned
            .find('{')
            .zip(cleaned.rfind('}'))
            .filter(|(start, end)| start < end)
            .map(|(start, end)| &cleaned[start..=end])
            .unwrap_or_default(),
    ];
    candidates.iter().find_map(|candidate| {
        serde_json::from_str::<serde_json::Value>(candidate)
            .ok()
            .filter(serde_json::Value::is_object)
            .or_else(|| {
                serde_yaml::from_str::<serde_json::Value>(candidate)
                    .ok()
                    .filter(serde_json::Value::is_object)
            })
    })
}

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default()
}

fn now_date() -> String {
    let days = now() / 86_400;
    let (year, month, day) = civil_date_from_days(days);
    format!("{year:04}-{month:02}-{day:02}")
}

fn civil_date_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    (year + if month <= 2 { 1 } else { 0 }, month, day)
}

fn read_markdown_tool_context(project_path: &str) -> String {
    let tool_root = std::path::Path::new(project_path).join(".brainstorm/tools/markdown");
    let files = [
        "README.md",
        "tool.yaml",
        "manifest.yaml",
        "RULES.md",
        "SKILLS.md",
        "SCHEMAS.md",
        "EXAMPLES.md",
        "INPUT_SCHEMA.json",
        "OUTPUT_SCHEMA.json",
    ];
    let mut context = String::new();
    for file in files {
        let path = tool_root.join(file);
        if let Ok(content) = std::fs::read_to_string(path) {
            context.push_str(&format!("\n### {file}\n{content}\n"));
        }
    }
    if context.is_empty() {
        "No Markdown tool package files were found. Use YAML frontmatter at byte 0, a clear Markdown body, headings, and concise semantic tags.".into()
    } else {
        context.chars().take(100_000).collect()
    }
}

fn parse_knowledge_draft(content: &str) -> Result<KnowledgeDraft, AppError> {
    let trimmed = content.trim();
    let json_source = if trimmed.starts_with('{') {
        Some(trimmed)
    } else if trimmed.starts_with("```json") {
        Some(
            trimmed
                .trim_start_matches("```json")
                .trim()
                .trim_end_matches("```"),
        )
    } else {
        None
    };
    let Some(json_source) = json_source else {
        return parse_markdown_draft(trimmed);
    };
    let Some((start, end)) = json_source
        .find('{')
        .zip(json_source.rfind('}'))
        .filter(|(start, end)| start < end)
    else {
        return parse_markdown_draft(trimmed);
    };
    let json_text = &json_source[start..=end];
    let value: serde_json::Value = serde_json::from_str(json_text).map_err(|error| {
        eprintln!(
            "[KnowledgeEngine] invalid draft JSON: {} (length={})",
            error,
            content.len()
        );
        AppError::Ai("The AI returned an invalid knowledge note. Please try again.".into())
    })?;
    let title = value
        .get("title")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    let properties = value
        .get("properties")
        .or_else(|| value.get("frontmatter"))
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));
    let content_value = value
        .get("content")
        .or_else(|| value.get("body"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    let draft = KnowledgeDraft {
        title,
        properties,
        content: content_value,
    };
    if !draft.properties.is_object() || draft.content.trim().is_empty() {
        return Err(AppError::Ai(
            "The AI returned an incomplete knowledge note. Please try again.".into(),
        ));
    }
    Ok(draft)
}

fn parse_markdown_draft(content: &str) -> Result<KnowledgeDraft, AppError> {
    let lines = content.lines().collect::<Vec<_>>();
    let Some(opening_index) = lines.iter().position(|line| line.trim() == "---") else {
        let body = content.trim().to_string();
        let title = body
            .lines()
            .find_map(|line| line.strip_prefix("# "))
            .unwrap_or("Brainstorm note")
            .trim()
            .to_string();
        if body.is_empty() {
            return Err(AppError::Ai(
                "The AI returned an invalid knowledge note. Please try again.".into(),
            ));
        }
        eprintln!(
            "[KnowledgeEngine] accepted Markdown body without frontmatter (body_length={})",
            body.len()
        );
        return Ok(KnowledgeDraft {
            title,
            properties: serde_json::json!({}),
            content: body,
        });
    };
    let Some(closing_index) = lines
        .iter()
        .enumerate()
        .skip(opening_index + 1)
        .find_map(|(index, line)| (line.trim() == "---").then_some(index))
    else {
        return Err(AppError::Ai(
            "The AI returned incomplete Markdown frontmatter. Please try again.".into(),
        ));
    };
    let frontmatter_text = lines[opening_index + 1..closing_index].join("\n");
    let leading_markdown = lines[..opening_index].join("\n");
    let trailing_markdown = lines[closing_index + 1..].join("\n");
    let properties: serde_json::Value = serde_yaml::from_str(&frontmatter_text).map_err(|_| {
        AppError::Ai("The AI returned invalid Markdown frontmatter. Please try again.".into())
    })?;
    let title = properties
        .get("title")
        .or_else(|| properties.get("name"))
        .and_then(serde_json::Value::as_str)
        .or_else(|| {
            leading_markdown
                .lines()
                .find_map(|line| line.strip_prefix("# "))
        })
        .or_else(|| {
            trailing_markdown
                .lines()
                .find_map(|line| line.strip_prefix("# "))
        })
        .unwrap_or("Brainstorm note")
        .to_string();
    let body = if trailing_markdown.trim().is_empty() {
        leading_markdown.trim().to_string()
    } else {
        trailing_markdown.trim().to_string()
    };
    let draft = KnowledgeDraft {
        title,
        properties,
        content: body,
    };
    if !draft.properties.is_object() || draft.content.trim().is_empty() {
        return Err(AppError::Ai(
            "The AI returned an incomplete knowledge note. Please try again.".into(),
        ));
    }
    eprintln!(
        "[KnowledgeEngine] accepted Markdown draft with frontmatter (body_length={})",
        draft.content.len()
    );
    Ok(draft)
}

fn has_markdown_structure(content: &str) -> bool {
    let section_count = content
        .lines()
        .filter(|line| line.trim_start().starts_with("## "))
        .count();
    let has_list = content.lines().any(|line| {
        let trimmed = line.trim_start();
        trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("1. ")
    });
    content
        .lines()
        .any(|line| line.trim_start().starts_with("# "))
        && section_count >= 2
        && has_list
}

fn mode_instructions(mode: &ChatMode) -> &'static str {
    match mode {
        ChatMode::Normal => "You are Brainstorm in Normal mode. Have a natural conversation. The local knowledge base is checked before every response; when retrieved notes are present, use them as the primary source and only fall back to general model knowledge when they do not answer the request.",
        ChatMode::Plan => "You are Brainstorm in Plan mode. Understand the objective before consequential actions. Ask concise questions only when important information is missing; otherwise present a clear plan and proceed according to the application's confirmation behavior. When the user must choose between approaches, include a concise markdown section titled 'Options' for readable fallback rendering. At the very end, append exactly one hidden machine-readable block in this form: <!-- brainstorm-plan-data {\"type\":\"plan\",\"selectionMode\":\"single\",\"options\":[{\"id\":\"stable-kebab-id\",\"title\":\"Short visible label\",\"description\":\"Brief explanation\",\"prompt\":\"Complete natural-language prompt to put in the composer\"}]} -->. Use selectionMode 'multiple' only when several choices can be selected together. Options must represent meaningful user decisions, not ordinary plan steps. Do not put commentary or Markdown inside the hidden JSON block, and never expose internal IDs outside it.",
        ChatMode::Research => "You are Brainstorm in Research mode. Investigate carefully, prefer relevant workspace and web sources when available, distinguish evidence from inference, and provide a concise synthesis with useful source context.",
    }
}

fn normalize_title(value: &str, source: &str) -> String {
    let title = value
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .replace('\n', " ");
    if title.is_empty() {
        fallback_title(source)
    } else {
        title.chars().take(80).collect()
    }
}

fn fallback_title(source: &str) -> String {
    let title = source.split_whitespace().collect::<Vec<_>>().join(" ");
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
mod tests {
    use super::preserve_knowledge_links;
    use serde_json::json;

    #[test]
    fn preserves_links_when_fallback_metadata_replaces_properties() {
        let original = json!({
            "title": "King Cobra",
            "links": ["[[Snake Venom Composition and Effects]]"]
        });
        let mut fallback = json!({
            "name": "King Cobra",
            "summary": "A venomous snake."
        });

        preserve_knowledge_links(&original, &mut fallback);

        assert_eq!(
            fallback["links"],
            json!(["[[Snake Venom Composition and Effects]]"])
        );
    }
}
