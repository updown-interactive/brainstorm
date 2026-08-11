use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub permissions: &'static [&'static str],
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
    ]
}

pub fn contains(name: &str) -> bool {
    definitions()
        .iter()
        .any(|definition| definition.name == name)
}

#[cfg(test)]
mod tests {
    use super::contains;

    #[test]
    fn registry_exposes_only_the_initial_fetch_operation() {
        assert!(contains("web.fetch"));
        assert!(!contains("web.search"));
    }
}
