use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;

pub struct DbState {
    pub pool: SqlitePool,
}

pub async fn init(_app_handle: &tauri::AppHandle) -> Result<DbState, String> {
    // In a real app, you might want to use `tauri::api::path::app_data_dir()`
    // to put the database in a standard location. For simplicity we use a local file.
    let db_path = "sqlite:brainstorm.db";

    let options = SqliteConnectOptions::from_str(db_path)
        .map_err(|e| e.to_string())?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // Initialize project tables
    crate::modules::project::service::init(&pool)
        .await
        .map_err(|e| e.to_string())?;
    let _ = sqlx::query("ALTER TABLE projects ADD COLUMN last_conversation_id TEXT")
        .execute(&pool)
        .await;
    crate::modules::conversation::commands::init(&pool)
        .await
        .map_err(|e| e.to_string())?;
    crate::modules::context::init(&pool)
        .await
        .map_err(|e| e.to_string())?;
    crate::modules::ai::commands::init(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(DbState { pool })
}
