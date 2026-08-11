use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,

    // Identity
    pub name: String,
    pub description: Option<String>,

    // Appearance
    pub icon: Option<String>,
    pub color: Option<i64>, // SQLite integer maps to i64 in Rust for safety
    pub banner: Option<String>,

    // Storage
    pub path: String,

    // Project Type
    pub template: String,

    // Versioning
    pub version: String,
    pub schema_version: i64,

    // Statistics (cached)
    pub document_count: i64,
    pub graph_node_count: i64,
    pub chat_count: i64,
    pub task_count: i64,
    pub attachment_count: i64,

    // Status
    pub is_favorite: i64,
    pub is_archived: i64,

    // Timestamps
    pub created_at: i64,
    pub updated_at: i64,
    pub last_opened_at: Option<i64>,
    pub last_conversation_id: Option<String>,

    // Optional metadata
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectPayload {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<i64>,
    pub banner: Option<String>,
    pub path: String,
    pub template: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectPayload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<i64>,
}
