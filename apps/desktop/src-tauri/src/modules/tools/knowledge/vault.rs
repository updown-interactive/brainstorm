use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use crate::{
    core::error::AppError,
    modules::{
        tools::{registry, PermissionSet, ToolRuntime},
        vault::VaultService,
    },
};

const READ_OPERATIONS: &[&str] = &[
    "knowledge.vault.list",
    "knowledge.vault.tree",
    "knowledge.vault.exists",
    "knowledge.vault.info",
];
const WRITE_OPERATIONS: &[&str] = &[
    "knowledge.vault.create_file",
    "knowledge.vault.create_folder",
    "knowledge.vault.move",
    "knowledge.vault.rename",
    "knowledge.vault.delete",
];

pub struct KnowledgeVaultState {
    pub runtime: ToolRuntime,
}

impl Default for KnowledgeVaultState {
    fn default() -> Self {
        Self {
            runtime: ToolRuntime::new(PermissionSet::native_defaults()),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct VaultRequest {
    pub operation: String,
    pub project_path: String,
    pub path: Option<String>,
    pub depth: Option<usize>,
    pub source: Option<String>,
    pub destination: Option<String>,
    pub name: Option<String>,
    pub content: Option<String>,
    #[serde(default)]
    pub recursive: bool,
}

#[derive(Debug, Deserialize)]
struct KnowledgeManifest {
    permissions: KnowledgePermissions,
    tools: Vec<KnowledgeTool>,
}
#[derive(Debug, Deserialize)]
struct KnowledgePermissions {
    vault_read: bool,
    vault_write: bool,
}
#[derive(Debug, Deserialize)]
struct KnowledgeTool {
    name: String,
    #[serde(default = "default_enabled")]
    enabled: bool,
}

#[tauri::command]
pub async fn knowledge_vault_execute(
    request: VaultRequest,
    state: State<'_, KnowledgeVaultState>,
) -> Result<Value, AppError> {
    let operation = request.operation.clone();
    if (!READ_OPERATIONS.contains(&operation.as_str())
        && !WRITE_OPERATIONS.contains(&operation.as_str()))
        || !registry::contains(&operation)
    {
        return Err(AppError::Tool(
            "unsupported knowledge vault operation".into(),
        ));
    }
    let manifest_path = std::path::Path::new(&request.project_path)
        .join(".brainstorm/tools/knowledge/manifest.yaml");
    let manifest_content = std::fs::read_to_string(manifest_path)
        .map_err(|_| AppError::Tool("knowledge tool configuration is missing or invalid".into()))?;
    let manifest: KnowledgeManifest = serde_yaml::from_str(&manifest_content)
        .map_err(|_| AppError::Tool("knowledge tool configuration is missing or invalid".into()))?;
    if !manifest
        .tools
        .iter()
        .any(|tool| tool.name == operation && tool.enabled)
    {
        return Err(AppError::Tool(
            "knowledge vault operation is disabled by project configuration".into(),
        ));
    }
    if READ_OPERATIONS.contains(&operation.as_str()) {
        if !manifest.permissions.vault_read {
            return Err(AppError::Tool(
                "vault read permission is not granted".into(),
            ));
        }
        state.runtime.require_vault_read()?;
    } else {
        if !manifest.permissions.vault_write {
            return Err(AppError::Tool(
                "vault write permission is not granted".into(),
            ));
        }
        state.runtime.require_vault_write()?;
    }
    let project_path = request.project_path.clone();
    tokio::task::spawn_blocking(move || execute_blocking(&operation, &project_path, request))
        .await
        .map_err(|_| AppError::Tool("knowledge vault operation failed".into()))?
        .map_err(|error| AppError::Tool(error.to_string()))
}

fn execute_blocking(
    operation: &str,
    project_path: &str,
    request: VaultRequest,
) -> Result<Value, crate::modules::vault::error::VaultError> {
    let service = VaultService::new(project_path)?;
    match operation {
        "knowledge.vault.list" => Ok(
            json!({ "path": request.path.clone().unwrap_or_default(), "entries": service.list(request.path.as_deref())? }),
        ),
        "knowledge.vault.tree" => Ok(
            json!({ "path": request.path.clone().unwrap_or_default(), "entries": service.tree(request.path.as_deref(), request.depth)? }),
        ),
        "knowledge.vault.exists" => {
            let path = request.path.unwrap_or_default();
            let entry_type = service.exists(&path)?;
            Ok(match entry_type {
                Some(entry_type) => json!({ "path": path, "exists": true, "type": entry_type }),
                None => json!({ "path": path, "exists": false }),
            })
        }
        "knowledge.vault.info" => {
            let info = service.info(request.path.as_deref().unwrap_or_default())?;
            Ok(serde_json::to_value(info).unwrap_or_else(|_| json!({ "success": false })))
        }
        "knowledge.vault.create_file" => {
            let path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.create_file(path, request.content.as_deref())?;
            Ok(json!({ "success": true, "path": path }))
        }
        "knowledge.vault.create_folder" => {
            let path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.create_folder(path)?;
            Ok(json!({ "success": true, "path": path }))
        }
        "knowledge.vault.move" => {
            let source = request
                .source
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            let destination = request
                .destination
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.move_path(source, destination)?;
            Ok(json!({ "success": true, "source": source, "destination": destination }))
        }
        "knowledge.vault.rename" => {
            let path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            let name = request
                .name
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.rename(path, name)?;
            Ok(json!({ "success": true, "path": path, "name": name }))
        }
        "knowledge.vault.delete" => {
            let path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.delete(path, request.recursive)?;
            Ok(json!({ "success": true, "path": path }))
        }
        _ => Err(crate::modules::vault::error::VaultError::InvalidOperation(
            operation.into(),
        )),
    }
}

fn default_enabled() -> bool {
    true
}
