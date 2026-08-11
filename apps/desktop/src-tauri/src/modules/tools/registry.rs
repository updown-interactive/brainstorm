use serde::Serialize;
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize)]
pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub permissions: &'static [&'static str],
}

impl ToolDefinition {
    pub fn schema(&self) -> Value {
        match self.name {
            "web.fetch" => json!({
                "type": "object",
                "required": ["url"],
                "properties": {
                    "url": { "type": "string", "description": "HTTP or HTTPS URL to fetch" }
                },
                "additionalProperties": false
            }),
            "search.query" => json!({
                "type": "object",
                "required": ["query"],
                "properties": {
                    "query": { "type": "string" },
                    "limit": { "type": "integer", "minimum": 1, "maximum": 50 },
                    "path": { "type": ["string", "null"] },
                    "tags": { "type": ["array", "null"], "items": { "type": "string" } }
                },
                "additionalProperties": false
            }),
            name if name.starts_with("markdown.") => json!({
                "type": "object",
                "required": ["path"],
                "properties": {
                    "path": { "type": "string" }
                },
                "additionalProperties": false
            }),
            name if name.starts_with("vault.") => json!({
                "type": "object",
                "required": [],
                "properties": {
                    "path": { "type": ["string", "null"] },
                    "depth": { "type": ["integer", "null"] },
                    "source": { "type": ["string", "null"] },
                    "destination": { "type": ["string", "null"] },
                    "name": { "type": ["string", "null"] },
                    "content": { "type": ["string", "null"] },
                    "recursive": { "type": "boolean" }
                },
                "additionalProperties": false
            }),
            _ => json!({ "type": "object", "additionalProperties": false }),
        }
    }
}

pub fn definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "web.fetch",
            description: "Fetch a public web page and return readable content",
            permissions: &["network"],
        },
        ToolDefinition {
            name: "markdown.read",
            description: "Read a Markdown document and return its structured representation",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "markdown.metadata",
            description: "Extract document metadata and YAML frontmatter",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "markdown.links",
            description: "Extract wiki links and Markdown links from a document",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "markdown.headings",
            description: "Extract the heading structure of a Markdown document",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "search.query",
            description: "Search the Brainstorm vault for relevant documents and content",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "vault.list",
            description: "List files and folders in the vault",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "vault.tree",
            description: "Get the directory structure of the vault",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "vault.exists",
            description: "Check whether a path exists in the vault",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "vault.info",
            description: "Get metadata about a vault file or directory",
            permissions: &["vault_read"],
        },
        ToolDefinition {
            name: "vault.create_file",
            description: "Create a file in the vault",
            permissions: &["vault_write"],
        },
        ToolDefinition {
            name: "vault.create_folder",
            description: "Create a folder in the vault",
            permissions: &["vault_write"],
        },
        ToolDefinition {
            name: "vault.move",
            description: "Move a file or folder within the vault",
            permissions: &["vault_write"],
        },
        ToolDefinition {
            name: "vault.rename",
            description: "Rename a file or folder within the vault",
            permissions: &["vault_write"],
        },
        ToolDefinition {
            name: "vault.delete",
            description: "Delete a file or folder from the vault",
            permissions: &["vault_write"],
        },
    ]
}

pub fn contains(name: &str) -> bool {
    definitions()
        .iter()
        .any(|definition| definition.name == name)
}

pub fn get(name: &str) -> Option<ToolDefinition> {
    definitions()
        .into_iter()
        .find(|definition| definition.name == name)
}

pub fn list() -> Vec<ToolDefinition> {
    definitions()
}

#[cfg(test)]
mod tests {
    use super::{contains, get};

    #[test]
    fn registry_exposes_only_the_initial_fetch_operation() {
        assert!(contains("web.fetch"));
        assert!(!contains("web.search"));
    }

    #[test]
    fn registry_exposes_schemas_for_registered_tools() {
        let definition = get("search.query").expect("search.query is registered");
        assert_eq!(definition.schema()["type"], "object");
        assert!(definition.schema()["required"].as_array().is_some());
    }
}
