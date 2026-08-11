use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub permissions: &'static [&'static str],
}

pub fn definitions() -> Vec<ToolDefinition> {
    vec![ToolDefinition {
        name: "web.fetch",
        description: "Fetch a public web page and return readable content",
        permissions: &["network"],
    }]
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
