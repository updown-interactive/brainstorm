use serde::Deserialize;
use tauri::State;

use super::{client::WebClient, config::WebManifest, fetch::WebTool, types::WebFetchResult};
use crate::{
    core::error::AppError,
    modules::tools::{registry, PermissionSet, ToolRuntime},
};

pub struct WebState {
    pub tool: WebTool,
    pub runtime: ToolRuntime,
}

impl WebState {
    pub fn new() -> Result<Self, AppError> {
        Ok(Self {
            tool: WebTool::new(
                WebClient::new().map_err(|error| AppError::Tool(error.to_string()))?,
            ),
            runtime: ToolRuntime::new(PermissionSet::native_defaults()),
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct WebFetchRequest {
    pub url: String,
    pub project_path: String,
}

#[tauri::command]
pub async fn web_fetch(
    request: WebFetchRequest,
    state: State<'_, WebState>,
) -> Result<WebFetchResult, AppError> {
    execute(request, &state.tool, &state.runtime).await
}

pub async fn execute(
    request: WebFetchRequest,
    tool: &WebTool,
    runtime: &ToolRuntime,
) -> Result<WebFetchResult, AppError> {
    if !registry::contains("web.fetch") {
        return Err(AppError::Tool("web.fetch is not registered".into()));
    }
    let config = WebManifest::load(std::path::Path::new(&request.project_path))
        .map_err(|error| AppError::Tool(error.to_string()))?;
    if !config.permissions.network || !config.enables("web.fetch") {
        return Err(AppError::Tool(
            "web.fetch is disabled by project configuration".into(),
        ));
    }
    runtime.require_network()?;
    tool.execute(serde_json::json!({ "url": request.url }), &config)
        .await
}
