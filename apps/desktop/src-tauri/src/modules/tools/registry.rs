use serde::Serialize;
use serde_json::json;

#[derive(Debug, Clone, Serialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub permissions: Vec<String>,
}

pub fn definitions() -> Vec<ToolDefinition> {
    vec![
        definition(
            "web.fetch",
            "Fetch a public web page and return readable content",
            json!({"type":"object","properties":{"url":{"type":"string","description":"The public URL to fetch"}},"required":["url"]}),
            &["network"],
        ),
        definition(
            "markdown.read",
            "Read a Markdown document and return its structured representation",
            markdown_schema(),
            &["vault_read"],
        ),
        definition(
            "markdown.metadata",
            "Extract document metadata and YAML frontmatter",
            markdown_schema(),
            &["vault_read"],
        ),
        definition(
            "markdown.links",
            "Extract wiki links and Markdown links from a document",
            markdown_schema(),
            &["vault_read"],
        ),
        definition(
            "markdown.headings",
            "Extract the heading structure of a Markdown document",
            markdown_schema(),
            &["vault_read"],
        ),
        definition(
            "search.query",
            "Search the Brainstorm vault for relevant documents and content",
            json!({"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer"},"path":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}},"required":["query"]}),
            &["vault_read"],
        ),
        definition(
            "vault.list",
            "List files and folders in the vault",
            vault_read_schema(),
            &["vault_read"],
        ),
        definition(
            "vault.tree",
            "Get the directory structure of the vault",
            vault_read_schema(),
            &["vault_read"],
        ),
        definition(
            "vault.exists",
            "Check whether a path exists in the vault",
            vault_read_schema(),
            &["vault_read"],
        ),
        definition(
            "vault.info",
            "Get metadata about a vault file or directory",
            vault_read_schema(),
            &["vault_read"],
        ),
        definition(
            "vault.create_file",
            "Create a file in the vault. For Markdown files, frontmatter MUST include non-empty name, author, created, and updated properties. Add other Markdown properties intelligently when relevant: type, domain, status, tags, aliases, links, summary, icon, favorite, priority, description, published, and optional cover/contributors/custom fields. Use typed YAML values, YYYY-MM-DD dates, YAML lists, and a blank line after the closing --- before the Markdown body. Preserve wiki links such as [[Test]].",
            create_file_schema(),
            &["vault_write"],
        ),
        definition(
            "vault.create_folder",
            "Create a folder in the vault",
            create_folder_schema(),
            &["vault_write"],
        ),
        definition(
            "vault.move",
            "Move a file or folder within the vault",
            move_schema(),
            &["vault_write"],
        ),
        definition(
            "vault.rename",
            "Rename a file or folder within the vault",
            rename_schema(),
            &["vault_write"],
        ),
        definition(
            "vault.delete",
            "Delete a file or folder from the vault",
            delete_schema(),
            &["vault_write"],
        ),
    ]
}

fn definition(
    name: &str,
    description: &str,
    input_schema: serde_json::Value,
    permissions: &[&str],
) -> ToolDefinition {
    ToolDefinition {
        name: name.into(),
        description: description.into(),
        input_schema,
        permissions: permissions.iter().map(|value| (*value).into()).collect(),
    }
}

fn markdown_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string"}},"required":["path"]})
}
fn vault_read_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string"},"depth":{"type":"integer"}},"required":["path"]})
}
fn create_file_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string","description":"Target path or path whose filename should be replaced by name."},"name":{"type":"string","description":"Special canonical file name and Markdown title. When provided, it controls the final filename."},"content":{"type":"string","description":"File content. For .md files, begin with YAML frontmatter containing non-empty name, author, created, and updated fields. Add other supported properties only when they are meaningful for the document, then place a blank line before the Markdown body."}},"required":["path","content"]})
}
fn create_folder_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string"},"recursive":{"type":"boolean"}},"required":["path"]})
}
fn move_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"source":{"type":"string"},"destination":{"type":"string"}},"required":["source","destination"]})
}
fn rename_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string"},"name":{"type":"string"}},"required":["path","name"]})
}
fn delete_schema() -> serde_json::Value {
    json!({"type":"object","properties":{"path":{"type":"string"},"recursive":{"type":"boolean"}},"required":["path"]})
}

pub fn contains(name: &str) -> bool {
    definitions()
        .iter()
        .any(|definition| definition.name == name)
}

#[cfg(test)]
mod tests {
    use super::{contains, definitions};

    #[test]
    fn registry_exposes_only_the_initial_fetch_operation() {
        assert!(contains("web.fetch"));
        assert!(!contains("web.search"));
    }

    #[test]
    fn create_file_schema_requires_path_and_content() {
        let definition = definitions()
            .into_iter()
            .find(|item| item.name == "vault.create_file")
            .expect("vault.create_file should be registered");
        assert_eq!(
            definition.input_schema["required"],
            serde_json::json!(["path", "content"])
        );
        assert!(definition.input_schema["properties"]
            .get("recursive")
            .is_none());
        assert!(definition.input_schema["properties"].get("name").is_some());
    }
}
