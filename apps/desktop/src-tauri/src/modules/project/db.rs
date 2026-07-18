use super::model::Project;
use crate::core::error::AppError;
use sqlx::SqlitePool;

pub async fn init_table(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color INTEGER,
            banner TEXT,
            path TEXT NOT NULL UNIQUE,
            template TEXT NOT NULL DEFAULT 'blank',
            version TEXT NOT NULL DEFAULT '1.0.0',
            schema_version INTEGER NOT NULL DEFAULT 1,
            document_count INTEGER NOT NULL DEFAULT 0,
            graph_node_count INTEGER NOT NULL DEFAULT 0,
            chat_count INTEGER NOT NULL DEFAULT 0,
            task_count INTEGER NOT NULL DEFAULT 0,
            attachment_count INTEGER NOT NULL DEFAULT 0,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_opened_at INTEGER,
            metadata TEXT
        );
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_all_projects(pool: &SqlitePool) -> Result<Vec<Project>, AppError> {
    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects")
        .fetch_all(pool)
        .await?;

    Ok(projects)
}

pub async fn create_project(pool: &SqlitePool, project: &Project) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO projects (
            id, name, description, icon, color, banner, path, template, version, schema_version,
            document_count, graph_node_count, chat_count, task_count, attachment_count,
            is_favorite, is_archived, created_at, updated_at, last_opened_at, metadata
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15,
            ?16, ?17, ?18, ?19, ?20, ?21
        )
        "#,
    )
    .bind(&project.id)
    .bind(&project.name)
    .bind(&project.description)
    .bind(&project.icon)
    .bind(&project.color)
    .bind(&project.banner)
    .bind(&project.path)
    .bind(&project.template)
    .bind(&project.version)
    .bind(project.schema_version)
    .bind(project.document_count)
    .bind(project.graph_node_count)
    .bind(project.chat_count)
    .bind(project.task_count)
    .bind(project.attachment_count)
    .bind(project.is_favorite)
    .bind(project.is_archived)
    .bind(project.created_at)
    .bind(project.updated_at)
    .bind(project.last_opened_at)
    .bind(&project.metadata)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_project(
    pool: &SqlitePool,
    payload: &super::model::UpdateProjectPayload,
    updated_at: i64,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        UPDATE projects SET
            name = ?1,
            description = ?2,
            icon = ?3,
            color = ?4,
            updated_at = ?5
        WHERE id = ?6
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.icon)
    .bind(&payload.color)
    .bind(updated_at)
    .bind(&payload.id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_project(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    sqlx::query("DELETE FROM projects WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
