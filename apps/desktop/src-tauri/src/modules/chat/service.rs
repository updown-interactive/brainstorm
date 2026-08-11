use super::commands::{SendMessageRequest, SendMessageResponse};
use crate::core::error::AppError;
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
    project::db as project_db,
    tools::{agent, registry},
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
        let project = project_db::get_project(pool, &request.project_id)
            .await?
            .ok_or_else(|| AppError::Ai("Project not found".into()))?;
        let agent_id = request.agent_id.as_deref().unwrap_or("cerebrum");
        let agent_context = agent::resolve(&project.path, agent_id)?;
        let tools = registry::list()
            .into_iter()
            .filter(|definition| agent::can_use(&agent_context, definition.name))
            .map(|definition| crate::modules::ai::request::ToolDefinition {
                name: definition.name.to_string(),
                description: definition.description.to_string(),
                parameters: definition.schema(),
            })
            .collect();
        let llm_request = LlmRequest {
            model: model.clone(),
            messages: history
                .into_iter()
                .map(|message| LlmMessage {
                    role: match message.role.as_str() {
                        "assistant" => LlmRole::Assistant,
                        "system" => LlmRole::System,
                        "tool" => LlmRole::Tool,
                        _ => LlmRole::User,
                    },
                    content: message.content,
                })
                .collect(),
            tools,
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
        sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&assistant_id).bind(&conversation_id).bind(MessageRole::Assistant.as_str()).bind("").bind(MessageStatus::Streaming.as_str()).bind(&provider_config.provider_id).bind(&model).bind(created_at).execute(pool).await?;
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
                    };
                    let _ = app.emit(
                        "chat-stream",
                        super::commands::ChatStreamEvent {
                            conversation_id: conversation_id.clone(),
                            message_id: assistant_id,
                            delta: String::new(),
                            done: true,
                            message: Some(failed_message),
                        },
                    );
                    return Err(AppError::Ai(error.safe_message()));
                }
            }
        }
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
        sqlx::query("INSERT INTO conversations (id, project_id, title, agent_id, provider_config_id, model, created_at, updated_at, archived) VALUES (?, ?, 'New conversation', ?, ?, ?, ?, ?, 0)").bind(&id).bind(&request.project_id).bind(&request.agent_id).bind(&request.provider_config_id).bind(&request.model).bind(timestamp).bind(timestamp).execute(pool).await?;
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
