use crate::core::error::AppError;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Get the path to the settings.json file
fn get_settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("Failed to get app data dir: {}", e)))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| AppError::Internal(format!("Failed to create app data dir: {}", e)))?;
    }

    Ok(app_dir.join("settings.json"))
}

pub fn get_settings(app: &AppHandle) -> Result<Value, AppError> {
    let settings_path = get_settings_path(app)?;

    if !settings_path.exists() {
        // Return a default settings object if the file doesn't exist
        return Ok(serde_json::json!({
            "theme": "dark"
        }));
    }

    let content = fs::read_to_string(settings_path)
        .map_err(|e| AppError::Internal(format!("Failed to read settings: {}", e)))?;

    let settings: Value = serde_json::from_str(&content)
        .map_err(|e| AppError::Internal(format!("Failed to parse settings: {}", e)))?;

    Ok(settings)
}

pub fn save_settings(app: &AppHandle, settings: Value) -> Result<(), AppError> {
    let settings_path = get_settings_path(app)?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| AppError::Internal(format!("Failed to serialize settings: {}", e)))?;

    fs::write(settings_path, content)
        .map_err(|e| AppError::Internal(format!("Failed to write settings: {}", e)))?;

    Ok(())
}
