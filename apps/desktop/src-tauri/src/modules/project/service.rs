use super::model::Project;
use super::{bootstrap, db};
use crate::core::error::AppError;
use sqlx::SqlitePool;

pub async fn init(pool: &SqlitePool) -> Result<(), AppError> {
    db::init_table(pool).await?;
    Ok(())
}

pub async fn get_projects(pool: &SqlitePool) -> Result<Vec<Project>, AppError> {
    db::get_all_projects(pool).await
}

pub async fn create_project(
    pool: &SqlitePool,
    payload: super::model::CreateProjectPayload,
) -> Result<Project, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let project = Project {
        id: uuid::Uuid::new_v4().to_string(),
        name: payload.name,
        description: payload.description,
        icon: payload.icon,
        color: payload.color,
        banner: payload.banner,
        path: payload.path,
        template: payload.template.unwrap_or_else(|| "blank".to_string()),
        version: "1.0.0".to_string(),
        schema_version: 1,
        document_count: 0,
        graph_node_count: 0,
        chat_count: 0,
        task_count: 0,
        attachment_count: 0,
        is_favorite: 0,
        is_archived: 0,
        created_at: now,
        updated_at: now,
        last_opened_at: Some(now),
        metadata: None,
    };

    bootstrap::ensure_project_bootstrap(&project.path)?;
    db::create_project(pool, &project).await?;

    Ok(project)
}

pub async fn update_project(
    pool: &SqlitePool,
    payload: super::model::UpdateProjectPayload,
) -> Result<(), AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    db::update_project(pool, &payload, now).await?;
    Ok(())
}

pub async fn delete_project(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    db::delete_project(pool, id).await?;
    Ok(())
}
