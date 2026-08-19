use super::service::ChatService;
use crate::core::{db::DbState, error::AppError};
use crate::modules::context::KnowledgeContext;
use crate::modules::conversation::model::ConversationMessage;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChatMode {
    Normal,
    Plan,
    Research,
}

impl Default for ChatMode {
    fn default() -> Self {
        Self::Normal
    }
}

pub struct ChatState {
    pub service: Arc<ChatService>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub project_id: String,
    pub conversation_id: Option<String>,
    pub content: String,
    #[serde(default)]
    pub mode: ChatMode,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateKnowledgeRequest {
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub title: String,
    pub response: String,
    pub project_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeDraft {
    pub title: String,
    pub properties: serde_json::Value,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageResponse {
    pub conversation_id: String,
    pub message: ConversationMessage,
    pub knowledge: Option<KnowledgeContext>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamEvent {
    pub conversation_id: String,
    pub message_id: String,
    pub delta: String,
    pub done: bool,
    pub message: Option<ConversationMessage>,
    pub knowledge: Option<KnowledgeContext>,
}

#[tauri::command]
pub async fn chat_send_message(
    app: AppHandle,
    request: SendMessageRequest,
    db: State<'_, DbState>,
    chat: State<'_, ChatState>,
) -> Result<SendMessageResponse, AppError> {
    chat.service.send_message(&db.pool, &app, request).await
}

#[tauri::command]
pub async fn chat_generate_knowledge(
    request: GenerateKnowledgeRequest,
    db: State<'_, DbState>,
    chat: State<'_, ChatState>,
) -> Result<KnowledgeDraft, AppError> {
    chat.service.generate_knowledge(&db.pool, request).await
}
