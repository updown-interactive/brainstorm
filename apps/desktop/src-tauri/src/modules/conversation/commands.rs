use super::{db, model::*};
use crate::core::{db::DbState, error::AppError};
use sqlx::SqlitePool;
use tauri::State;

pub async fn init(pool: &SqlitePool) -> Result<(), AppError> {
    db::init(pool).await
}
fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default()
}

#[tauri::command]
pub async fn create_conversation(
    request: CreateConversationRequest,
    state: State<'_, DbState>,
) -> Result<Conversation, AppError> {
    if !db::project_exists(&state.pool, &request.project_id).await? {
        return Err(AppError::Internal("Project not found".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let timestamp = now();
    let title = request
        .title
        .unwrap_or_else(|| "New conversation".into())
        .trim()
        .to_string();
    if title.is_empty() {
        return Err(AppError::Internal(
            "Conversation title cannot be empty".into(),
        ));
    }
    sqlx::query("INSERT INTO conversations (id, project_id, title, agent_id, provider_config_id, model, created_at, updated_at, archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)").bind(&id).bind(&request.project_id).bind(&title).bind(&request.agent_id).bind(&request.provider_config_id).bind(&request.model).bind(timestamp).bind(timestamp).execute(&state.pool).await?;
    Ok(Conversation {
        id,
        project_id: request.project_id,
        title,
        agent_id: request.agent_id,
        provider_config_id: request.provider_config_id,
        model: request.model,
        created_at: timestamp,
        updated_at: timestamp,
        last_message_at: None,
        archived: false,
    })
}

#[tauri::command]
pub async fn get_conversation_history(
    request: ConversationHistoryRequest,
    state: State<'_, DbState>,
) -> Result<ConversationHistory, AppError> {
    if !db::project_exists(&state.pool, &request.project_id).await? {
        return Err(AppError::Internal("Project not found".into()));
    }
    let include_archived = request.include_archived.unwrap_or(false);
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM conversations WHERE project_id = ? AND (? OR archived = 0)",
    )
    .bind(&request.project_id)
    .bind(include_archived)
    .fetch_one(&state.pool)
    .await?;
    Ok(ConversationHistory {
        conversations: db::summaries(
            &state.pool,
            &request.project_id,
            request.limit.unwrap_or(100),
            request.offset.unwrap_or(0),
            include_archived,
        )
        .await?,
        total,
    })
}

#[tauri::command]
pub async fn get_conversation(
    request: ConversationProjectRequest,
    state: State<'_, DbState>,
) -> Result<(Conversation, Vec<ConversationMessage>), AppError> {
    let conversation: Conversation =
        db::conversation(&state.pool, &request.project_id, &request.conversation_id)
            .await?
            .into();
    let messages = db::messages(&state.pool, &request.conversation_id, 50, 0)
        .await?
        .into_iter()
        .map(ConversationMessage::from)
        .collect();
    Ok((conversation, messages))
}

#[tauri::command]
pub async fn get_conversation_messages(
    request: ConversationMessagesRequest,
    state: State<'_, DbState>,
) -> Result<Vec<ConversationMessage>, AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    Ok(db::messages(
        &state.pool,
        &request.conversation_id,
        request.limit.unwrap_or(50),
        request.offset.unwrap_or(0),
    )
    .await?
    .into_iter()
    .map(ConversationMessage::from)
    .collect())
}

#[tauri::command]
pub async fn add_conversation_message(
    request: AddConversationMessageRequest,
    state: State<'_, DbState>,
) -> Result<ConversationMessage, AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    if request.content.trim().is_empty() {
        return Err(AppError::Internal("Message content cannot be empty".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let timestamp = now();
    let status = request.status.unwrap_or(MessageStatus::Completed);
    sqlx::query("INSERT INTO conversation_messages (id, conversation_id, role, content, status, provider, model, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)").bind(&id).bind(&request.conversation_id).bind(request.role.as_str()).bind(&request.content).bind(status.as_str()).bind(&request.provider).bind(&request.model).bind(timestamp).execute(&state.pool).await?;
    sqlx::query("UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ? AND project_id = ?").bind(timestamp).bind(timestamp).bind(&request.conversation_id).bind(&request.project_id).execute(&state.pool).await?;
    sqlx::query("UPDATE projects SET last_conversation_id = ?, updated_at = ? WHERE id = ?")
        .bind(&request.conversation_id)
        .bind(timestamp)
        .bind(&request.project_id)
        .execute(&state.pool)
        .await?;
    Ok(ConversationMessage {
        id,
        conversation_id: request.conversation_id,
        role: request.role,
        content: request.content,
        status,
        provider: request.provider,
        model: request.model,
        created_at: timestamp,
        updated_at: None,
        metadata: None,
    })
}

#[tauri::command]
pub async fn rename_conversation(
    request: RenameConversationRequest,
    state: State<'_, DbState>,
) -> Result<Conversation, AppError> {
    let title = request.title.trim().to_string();
    if title.is_empty() {
        return Err(AppError::Internal(
            "Conversation title cannot be empty".into(),
        ));
    }
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    sqlx::query(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND project_id = ?",
    )
    .bind(&title)
    .bind(now())
    .bind(&request.conversation_id)
    .bind(&request.project_id)
    .execute(&state.pool)
    .await?;
    Ok(
        db::conversation(&state.pool, &request.project_id, &request.conversation_id)
            .await?
            .into(),
    )
}

#[tauri::command]
pub async fn delete_conversation(
    request: ConversationProjectRequest,
    state: State<'_, DbState>,
) -> Result<(), AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    sqlx::query("DELETE FROM conversations WHERE id = ? AND project_id = ?")
        .bind(&request.conversation_id)
        .bind(&request.project_id)
        .execute(&state.pool)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn archive_conversation(
    request: ConversationProjectRequest,
    state: State<'_, DbState>,
) -> Result<(), AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    sqlx::query(
        "UPDATE conversations SET archived = 1, updated_at = ? WHERE id = ? AND project_id = ?",
    )
    .bind(now())
    .bind(&request.conversation_id)
    .bind(&request.project_id)
    .execute(&state.pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn unarchive_conversation(
    request: ConversationProjectRequest,
    state: State<'_, DbState>,
) -> Result<(), AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    sqlx::query(
        "UPDATE conversations SET archived = 0, updated_at = ? WHERE id = ? AND project_id = ?",
    )
    .bind(now())
    .bind(&request.conversation_id)
    .bind(&request.project_id)
    .execute(&state.pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn set_active_conversation(
    request: ConversationProjectRequest,
    state: State<'_, DbState>,
) -> Result<(), AppError> {
    db::conversation(&state.pool, &request.project_id, &request.conversation_id).await?;
    sqlx::query("UPDATE projects SET last_conversation_id = ? WHERE id = ?")
        .bind(&request.conversation_id)
        .bind(&request.project_id)
        .execute(&state.pool)
        .await?;
    Ok(())
}
