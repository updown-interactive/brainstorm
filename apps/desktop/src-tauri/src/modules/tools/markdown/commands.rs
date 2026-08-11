use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use crate::{
    core::error::AppError,
    modules::{
        tools::{registry, PermissionSet, ToolRuntime},
        vault::commands::read_markdown_document,
    },
};

use super::{error::MarkdownError, parser::parse_document, types::MarkdownDocument};

pub struct MarkdownState {
    pub runtime: ToolRuntime,
}

impl Default for MarkdownState {
    fn default() -> Self {
        Self {
            runtime: ToolRuntime::new(PermissionSet::native_defaults()),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct MarkdownRequest {
    pub operation: String,
    pub path: String,
    pub project_path: String,
}

#[tauri::command]
pub async fn markdown_execute(
    request: MarkdownRequest,
    state: State<'_, MarkdownState>,
) -> Result<Value, AppError> {
    let operation = request.operation.as_str();
    if !matches!(
        operation,
        "markdown.read" | "markdown.metadata" | "markdown.links" | "markdown.headings"
    ) || !registry::contains(operation)
    {
        return Err(AppError::Tool("unsupported markdown operation".into()));
    }
    state.runtime.require_vault_read()?;
    let manifest_path = std::path::Path::new(&request.project_path)
        .join(".brainstorm/tools/markdown/manifest.yaml");
    let manifest = std::fs::read_to_string(manifest_path)
        .map_err(|_| AppError::Tool("markdown tool configuration is missing or invalid".into()))?;
    let permissions: ManifestPermissions = serde_yaml::from_str(&manifest)
        .map_err(|_| AppError::Tool("markdown tool configuration is missing or invalid".into()))?;
    if !permissions.permissions.vault_read
        || !permissions
            .tools
            .iter()
            .any(|tool| tool.name == operation && tool.enabled)
    {
        return Err(AppError::Tool(
            "markdown operation is disabled by project configuration".into(),
        ));
    }
    let root = std::path::Path::new(&request.project_path);
    let content = read_markdown_document(root, &request.path)
        .map_err(|error| AppError::Tool(map_vault_error(error).to_string()))?;
    let document = parse_document(&request.path, &content)
        .map_err(|error| AppError::Tool(error.to_string()))?;
    Ok(result_for_operation(operation, document))
}

#[derive(Debug, Deserialize)]
struct ManifestPermissions {
    permissions: ManifestPermission,
    tools: Vec<ManifestTool>,
}
#[derive(Debug, Deserialize)]
struct ManifestPermission {
    vault_read: bool,
}
#[derive(Debug, Deserialize)]
struct ManifestTool {
    name: String,
    #[serde(default)]
    enabled: bool,
}

fn result_for_operation(operation: &str, document: MarkdownDocument) -> Value {
    match operation {
        "markdown.metadata" => json!({ "path": document.path, "metadata": document.frontmatter }),
        "markdown.links" => {
            json!({ "path": document.path, "wiki_links": document.wiki_links, "markdown_links": document.markdown_links })
        }
        "markdown.headings" => json!({ "path": document.path, "headings": document.headings }),
        _ => serde_json::to_value(document).unwrap_or_else(|_| json!({ "success": false })),
    }
}

fn map_vault_error(error: String) -> MarkdownError {
    if error.starts_with("document not found") {
        MarkdownError::DocumentNotFound(error)
    } else if error.contains("outside") {
        MarkdownError::PathOutsideVault
    } else if error.contains("unsupported") {
        MarkdownError::UnsupportedDocument
    } else if error.contains("invalid") {
        MarkdownError::InvalidPath
    } else {
        MarkdownError::Vault(error)
    }
}
