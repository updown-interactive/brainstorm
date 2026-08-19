mod assembler;
mod capabilities;
mod compactor;
mod retriever;
mod tokenizer;
mod types;

pub use assembler::{ContextManager, ContextRequest};
pub use types::{ContextAssembly, ContextItem, ContextItemType, StructuredConversationState};

use crate::core::error::AppError;
use sqlx::SqlitePool;

pub async fn init(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS conversation_context_state (
            conversation_id TEXT PRIMARY KEY NOT NULL,
            version INTEGER NOT NULL DEFAULT 0,
            summary TEXT NOT NULL DEFAULT '',
            structured_state TEXT NOT NULL DEFAULT '{}',
            compacted_through_created_at INTEGER,
            compacted_through_message_id TEXT,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await?;
    let _ = sqlx::query(
        "ALTER TABLE conversation_context_state ADD COLUMN compacted_through_message_id TEXT",
    )
    .execute(pool)
    .await;
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS conversation_context_snapshots (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            summary TEXT NOT NULL,
            structured_state TEXT NOT NULL,
            message_start_id TEXT,
            message_end_id TEXT,
            token_count INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await?;
    for query in [
        "CREATE INDEX IF NOT EXISTS idx_context_snapshots_conversation ON conversation_context_snapshots(conversation_id, version DESC)",
        "CREATE INDEX IF NOT EXISTS idx_context_state_updated ON conversation_context_state(updated_at DESC)",
    ] {
        sqlx::query(query).execute(pool).await?;
    }
    Ok(())
}
