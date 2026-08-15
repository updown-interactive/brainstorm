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
#[serde(rename_all = "camelCase")]
pub struct MarkdownRequest {
    pub operation: String,
    pub path: String,
    pub project_path: String,
    #[serde(default)]
    pub properties: Option<Value>,
    #[serde(default)]
    pub content: Option<String>,
}

#[tauri::command]
pub async fn markdown_execute(
    request: MarkdownRequest,
    state: State<'_, MarkdownState>,
) -> Result<Value, AppError> {
    eprintln!(
        "[MarkdownTool] operation={} project_path={} path={} has_properties={} has_content={}",
        request.operation,
        request.project_path,
        request.path,
        request.properties.is_some(),
        request
            .content
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty())
    );
    let operation = request.operation.as_str();
    if !matches!(
        operation,
        "markdown.read"
            | "markdown.metadata"
            | "markdown.links"
            | "markdown.headings"
            | "markdown.create"
    ) || !registry::contains(operation)
    {
        return Err(AppError::Tool("unsupported markdown operation".into()));
    }
    if operation == "markdown.create" {
        state.runtime.require_vault_write()?;
    } else {
        state.runtime.require_vault_read()?;
    }
    let manifest_path = std::path::Path::new(&request.project_path)
        .join(".brainstorm/tools/markdown/manifest.yaml");
    let manifest = std::fs::read_to_string(manifest_path)
        .map_err(|_| AppError::Tool("markdown tool configuration is missing or invalid".into()))?;
    let permissions: ManifestPermissions = serde_yaml::from_str(&manifest)
        .map_err(|_| AppError::Tool("markdown tool configuration is missing or invalid".into()))?;
    let operation_enabled = permissions
        .tools
        .iter()
        .any(|tool| tool.name == operation && tool.enabled)
        || (operation == "markdown.create" && permissions.permissions.vault_write);
    if !operation_enabled {
        return Err(AppError::Tool(
            "markdown operation is disabled by project configuration".into(),
        ));
    }
    if operation != "markdown.create" && !permissions.permissions.vault_read {
        return Err(AppError::Tool(
            "vault read permission is not granted".into(),
        ));
    }
    let root = std::path::Path::new(&request.project_path);
    if operation == "markdown.create" {
        if !permissions.permissions.vault_write {
            return Err(AppError::Tool(
                "vault write permission is not granted".into(),
            ));
        }
        let path = request.path.trim_matches('/');
        if !path.ends_with(".md") && !path.ends_with(".mdx") {
            return Err(AppError::Tool(
                "markdown.create only supports .md and .mdx files".into(),
            ));
        }
        let formatted = format_document(request.properties.as_ref(), request.content.as_deref())?;
        let service = crate::modules::vault::VaultService::new(root)
            .map_err(|error| AppError::Tool(error.to_string()))?;
        service
            .create_file(path, Some(&formatted))
            .map_err(|error| AppError::Tool(error.to_string()))?;
        let document =
            parse_document(path, &formatted).map_err(|error| AppError::Tool(error.to_string()))?;
        return Ok(json!({ "success": true, "path": path, "document": document }));
    }
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
    #[serde(default)]
    vault_write: bool,
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

fn format_document(properties: Option<&Value>, content: Option<&str>) -> Result<String, AppError> {
    let body = content.unwrap_or_default().trim();
    let frontmatter = properties
        .filter(|value| !value.is_null())
        .map(serde_yaml::to_string)
        .transpose()
        .map_err(|_| AppError::Tool("invalid Markdown properties".into()))?;
    let mut document = String::new();
    if let Some(frontmatter) = frontmatter {
        document.push_str("---\n");
        document.push_str(frontmatter.trim());
        document.push_str("\n---\n");
    }
    if !body.is_empty() {
        if !document.is_empty() {
            document.push('\n');
        }
        document.push_str(body);
        document.push('\n');
    }
    Ok(document)
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
