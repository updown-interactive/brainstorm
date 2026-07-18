use super::model::Project;
use super::service;
use crate::core::db::DbState;
use crate::core::error::AppError;

#[tauri::command]
pub async fn get_projects(state: tauri::State<'_, DbState>) -> Result<Vec<Project>, AppError> {
    service::get_projects(&state.pool).await
}

#[tauri::command]
pub async fn create_project(
    payload: super::model::CreateProjectPayload,
    state: tauri::State<'_, DbState>,
) -> Result<Project, AppError> {
    service::create_project(&state.pool, payload).await
}

#[tauri::command]
pub async fn update_project(
    payload: super::model::UpdateProjectPayload,
    state: tauri::State<'_, DbState>,
) -> Result<(), AppError> {
    service::update_project(&state.pool, payload).await
}

#[tauri::command]
pub async fn delete_project(id: String, state: tauri::State<'_, DbState>) -> Result<(), AppError> {
    service::delete_project(&state.pool, &id).await
}
