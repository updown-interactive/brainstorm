use super::model::{ConversationRow, ConversationSummary, MessageRow};
use crate::core::error::AppError;
use sqlx::SqlitePool;

pub async fn init(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query("CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, title TEXT NOT NULL, provider_config_id TEXT, model TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, last_message_at INTEGER, archived INTEGER NOT NULL DEFAULT 0, metadata TEXT, FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE)").execute(pool).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS conversation_messages (id TEXT PRIMARY KEY NOT NULL, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'completed', provider TEXT, model TEXT, created_at INTEGER NOT NULL, updated_at INTEGER, metadata TEXT, FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)").execute(pool).await?;
    for query in ["CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id)", "CREATE INDEX IF NOT EXISTS idx_conversations_project_updated ON conversations(project_id, updated_at DESC)", "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id)", "CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON conversation_messages(conversation_id, created_at ASC)"] { sqlx::query(query).execute(pool).await?; }
    Ok(())
}

pub async fn project_exists(pool: &SqlitePool, project_id: &str) -> Result<bool, AppError> {
    Ok(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM projects WHERE id = ?")
            .bind(project_id)
            .fetch_one(pool)
            .await?
            > 0,
    )
}
pub async fn conversation(
    pool: &SqlitePool,
    project_id: &str,
    id: &str,
) -> Result<ConversationRow, AppError> {
    sqlx::query_as("SELECT id, project_id, title, provider_config_id, model, created_at, updated_at, last_message_at, archived FROM conversations WHERE project_id = ? AND id = ?").bind(project_id).bind(id).fetch_optional(pool).await?.ok_or_else(|| AppError::Internal("Conversation not found for project".into()))
}
pub async fn messages(
    pool: &SqlitePool,
    conversation_id: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<MessageRow>, AppError> {
    Ok(sqlx::query_as("SELECT id, conversation_id, role, content, status, provider, model, created_at, updated_at, metadata FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?").bind(conversation_id).bind(limit).bind(offset).fetch_all(pool).await?)
}
pub async fn summaries(
    pool: &SqlitePool,
    project_id: &str,
    limit: u32,
    offset: u32,
    include_archived: bool,
) -> Result<Vec<ConversationSummary>, AppError> {
    Ok(sqlx::query_as("SELECT c.id, c.title, c.model, c.created_at, c.updated_at, c.last_message_at, COUNT(m.id) AS message_count FROM conversations c LEFT JOIN conversation_messages m ON m.conversation_id = c.id WHERE c.project_id = ? AND (? OR c.archived = 0) GROUP BY c.id ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC LIMIT ? OFFSET ?").bind(project_id).bind(include_archived).bind(limit).bind(offset).fetch_all(pool).await?)
}

pub async fn update_message_content(
    pool: &SqlitePool,
    message_id: &str,
    content: &str,
    status: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE conversation_messages SET content = ?, status = ?, updated_at = ? WHERE id = ?",
    )
    .bind(content)
    .bind(status)
    .bind(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_secs() as i64)
            .unwrap_or_default(),
    )
    .bind(message_id)
    .execute(pool)
    .await?;
    Ok(())
}
