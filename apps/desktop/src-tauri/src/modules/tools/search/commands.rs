use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::{
    core::error::AppError,
    modules::tools::{registry, PermissionSet, ToolRuntime},
};

use super::index::{SearchIndex, SearchQuery};

pub struct SearchState {
    pub runtime: ToolRuntime,
}

impl Default for SearchState {
    fn default() -> Self {
        Self {
            runtime: ToolRuntime::new(PermissionSet::native_defaults()),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub operation: String,
    pub project_path: String,
    pub query: String,
    pub limit: Option<usize>,
    pub path: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[tauri::command]
pub async fn search_execute(
    request: SearchRequest,
    state: State<'_, SearchState>,
) -> Result<Value, AppError> {
    execute(request, &state.runtime).await
}

pub async fn execute(request: SearchRequest, runtime: &ToolRuntime) -> Result<Value, AppError> {
    if request.operation != "search.query" || !registry::contains(&request.operation) {
        return Err(AppError::Tool("unsupported search operation".into()));
    }
    runtime.require_vault_read()?;

    let manifest_path =
        std::path::Path::new(&request.project_path).join(".brainstorm/tools/search/manifest.yaml");
    let manifest_content = std::fs::read_to_string(manifest_path)
        .map_err(|_| AppError::Tool("search tool configuration is missing or invalid".into()))?;
    let manifest: SearchManifest = serde_yaml::from_str(&manifest_content)
        .map_err(|_| AppError::Tool("search tool configuration is missing or invalid".into()))?;
    if !manifest.permissions.vault_read
        || !manifest
            .tools
            .iter()
            .any(|tool| tool.name == request.operation && tool.enabled)
    {
        return Err(AppError::Tool(
            "search operation is disabled by project configuration".into(),
        ));
    }

    tokio::task::spawn_blocking(move || {
        SearchIndex::open(&request.project_path)
            .and_then(|mut index| {
                index.query(SearchQuery {
                    query: request.query,
                    limit: request.limit,
                    path: request.path,
                    tags: request.tags,
                })
            })
            .map_err(|error| AppError::Tool(error.to_string()))
    })
    .await
    .map_err(|_| AppError::Tool("search operation failed".into()))?
}

#[derive(Debug, Deserialize)]
struct SearchManifest {
    permissions: SearchPermissions,
    tools: Vec<SearchTool>,
}

#[derive(Debug, Deserialize)]
struct SearchPermissions {
    vault_read: bool,
}

#[derive(Debug, Deserialize)]
struct SearchTool {
    name: String,
    #[serde(default = "default_enabled")]
    enabled: bool,
}

fn default_enabled() -> bool {
    true
}
