use super::service::ChatService;
use crate::core::{db::DbState, error::AppError};
use crate::modules::conversation::model::ConversationMessage;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, State};

pub struct ChatState {
    pub service: Arc<ChatService>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    pub project_id: String,
    pub conversation_id: Option<String>,
    pub content: String,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageResponse {
    pub conversation_id: String,
    pub message: ConversationMessage,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamEvent {
    pub conversation_id: String,
    pub message_id: String,
    pub delta: String,
    pub done: bool,
    pub message: Option<ConversationMessage>,
    pub progress: Option<ChatProgress>,
    pub created_files: Option<Vec<CreatedFile>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedFile {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProgress {
    pub phase: String,
    pub tool_name: Option<String>,
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
