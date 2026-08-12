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

const READ_OPERATIONS: &[&str] = &["vault.list", "vault.tree", "vault.exists", "vault.info"];
const WRITE_OPERATIONS: &[&str] = &[
    "vault.create_file",
    "vault.create_folder",
    "vault.move",
    "vault.rename",
    "vault.delete",
];

pub struct VaultState {
    pub runtime: ToolRuntime,
}

impl Default for VaultState {
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
struct VaultManifest {
    permissions: VaultPermissions,
    tools: Vec<VaultTool>,
}
#[derive(Debug, Deserialize)]
struct VaultPermissions {
    vault_read: bool,
    vault_write: bool,
}
#[derive(Debug, Deserialize)]
struct VaultTool {
    name: String,
    #[serde(default = "default_enabled")]
    enabled: bool,
}

#[tauri::command]
pub async fn vault_execute(
    request: VaultRequest,
    state: State<'_, VaultState>,
) -> Result<Value, AppError> {
    execute(request, &state.runtime).await
}

pub async fn execute(request: VaultRequest, runtime: &ToolRuntime) -> Result<Value, AppError> {
    let operation = request.operation.clone();
    if (!READ_OPERATIONS.contains(&operation.as_str())
        && !WRITE_OPERATIONS.contains(&operation.as_str()))
        || !registry::contains(&operation)
    {
        return Err(AppError::Tool("unsupported vault operation".into()));
    }
    let manifest_path =
        std::path::Path::new(&request.project_path).join(".brainstorm/tools/vault/manifest.yaml");
    let manifest_content = std::fs::read_to_string(manifest_path)
        .map_err(|_| AppError::Tool("vault tool configuration is missing or invalid".into()))?;
    let manifest: VaultManifest = serde_yaml::from_str(&manifest_content)
        .map_err(|_| AppError::Tool("vault tool configuration is missing or invalid".into()))?;
    if !manifest
        .tools
        .iter()
        .any(|tool| tool.name == operation && tool.enabled)
    {
        return Err(AppError::Tool(
            "vault operation is disabled by project configuration".into(),
        ));
    }
    if READ_OPERATIONS.contains(&operation.as_str()) {
        if !manifest.permissions.vault_read {
            return Err(AppError::Tool(
                "vault read permission is not granted".into(),
            ));
        }
        runtime.require_vault_read()?;
    } else {
        if !manifest.permissions.vault_write {
            return Err(AppError::Tool(
                "vault write permission is not granted".into(),
            ));
        }
        runtime.require_vault_write()?;
    }
    let project_path = request.project_path.clone();
    tokio::task::spawn_blocking(move || execute_blocking(&operation, &project_path, request))
        .await
        .map_err(|_| AppError::Tool("vault operation failed".into()))?
        .map_err(|error| AppError::Tool(error.to_string()))
}

fn execute_blocking(
    operation: &str,
    project_path: &str,
    request: VaultRequest,
) -> Result<Value, crate::modules::vault::error::VaultError> {
    let service = VaultService::new(project_path)?;
    match operation {
        "vault.list" => Ok(
            json!({ "path": request.path.clone().unwrap_or_default(), "entries": service.list(request.path.as_deref())? }),
        ),
        "vault.tree" => Ok(
            json!({ "path": request.path.clone().unwrap_or_default(), "entries": service.tree(request.path.as_deref(), request.depth)? }),
        ),
        "vault.exists" => {
            let path = request.path.unwrap_or_default();
            let entry_type = service.exists(&path)?;
            Ok(match entry_type {
                Some(entry_type) => json!({ "path": path, "exists": true, "type": entry_type }),
                None => json!({ "path": path, "exists": false }),
            })
        }
        "vault.info" => {
            let info = service.info(request.path.as_deref().unwrap_or_default())?;
            Ok(serde_json::to_value(info).unwrap_or_else(|_| json!({ "success": false })))
        }
        "vault.create_file" => {
            let requested_path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            let path = resolve_create_file_path(
                requested_path,
                request.name.as_deref(),
                request.content.as_deref(),
            );
            validate_markdown_frontmatter(&path, request.content.as_deref())?;
            if request.recursive {
                service.create_file_recursive(&path, request.content.as_deref())?;
            } else {
                service.create_file(&path, request.content.as_deref())?;
            }
            Ok(json!({ "success": true, "path": path, "name": request.name }))
        }
        "vault.create_folder" => {
            let path = request
                .path
                .as_deref()
                .ok_or(crate::modules::vault::error::VaultError::InvalidPath)?;
            service.create_folder(path)?;
            Ok(json!({ "success": true, "path": path }))
        }
        "vault.move" => {
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
        "vault.rename" => {
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
        "vault.delete" => {
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

fn validate_markdown_frontmatter(
    path: &str,
    content: Option<&str>,
) -> Result<(), crate::modules::vault::error::VaultError> {
    if !path.to_ascii_lowercase().ends_with(".md") {
        return Ok(());
    }

    let content = content.ok_or_else(|| {
        crate::modules::vault::error::VaultError::InvalidOperation(
            "Markdown files require YAML frontmatter with name, author, created, and updated."
                .into(),
        )
    })?;
    let (frontmatter, _) = crate::modules::tools::markdown::frontmatter::split_frontmatter(content)
        .map_err(|error| {
            crate::modules::vault::error::VaultError::InvalidOperation(format!(
                "invalid Markdown frontmatter: {error}"
            ))
        })?;

    for key in ["name", "author", "created", "updated"] {
        let is_present = frontmatter
            .get(key)
            .and_then(serde_json::Value::as_str)
            .is_some_and(|value| !value.trim().is_empty());
        if !is_present {
            return Err(crate::modules::vault::error::VaultError::InvalidOperation(
                format!("Markdown frontmatter requires a non-empty {key} property"),
            ));
        }
    }

    Ok(())
}

fn resolve_create_file_path(path: &str, name: Option<&str>, content: Option<&str>) -> String {
    let frontmatter_name = content
        .and_then(|content| content.strip_prefix("---\n"))
        .and_then(|frontmatter| frontmatter.split("\n---").next())
        .and_then(|frontmatter| serde_yaml::from_str::<serde_yaml::Value>(frontmatter).ok())
        .and_then(|frontmatter| {
            frontmatter
                .get("name")
                .and_then(|value| value.as_str())
                .map(str::to_owned)
        });
    let name = name.or(frontmatter_name.as_deref());
    let Some(name) = name.map(str::trim).filter(|name| !name.is_empty()) else {
        return path.to_owned();
    };
    let filename = std::path::Path::new(name)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(name);
    let extension = std::path::Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("md");
    let filename = if std::path::Path::new(filename).extension().is_some() {
        filename.to_owned()
    } else {
        format!("{filename}.{extension}")
    };
    std::path::Path::new(path)
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .map(|parent| parent.join(&filename).to_string_lossy().into_owned())
        .unwrap_or(filename)
}

fn default_enabled() -> bool {
    true
}
