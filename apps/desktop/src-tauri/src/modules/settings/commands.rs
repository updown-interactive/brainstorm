use crate::core::error::AppError;
use serde_json::Value;
use tauri::AppHandle;

use super::service;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Value, AppError> {
    service::get_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), AppError> {
    service::save_settings(&app, settings)
}
