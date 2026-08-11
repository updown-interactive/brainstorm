use serde_json::{Map, Value};

use super::error::MarkdownError;

pub fn split_frontmatter(content: &str) -> Result<(Value, &str), MarkdownError> {
    let Some(after_open) = content
        .strip_prefix("---\n")
        .or_else(|| content.strip_prefix("---\r\n"))
    else {
        return Ok((Value::Object(Map::new()), content));
    };
    let mut offset = 0;
    for line in after_open.split_inclusive('\n') {
        if line.trim() == "---" {
            let yaml = &after_open[..offset];
            let body = &after_open[offset + line.len()..];
            let value = serde_yaml::from_str::<Value>(yaml)
                .map_err(|error| MarkdownError::InvalidFrontmatter(error.to_string()))?;
            let value = if value.is_null() {
                Value::Object(Map::new())
            } else {
                value
            };
            return Ok((value, body));
        }
        offset += line.len();
    }
    Ok((Value::Object(Map::new()), content))
}

pub fn frontmatter_tags(frontmatter: &Value) -> Vec<String> {
    frontmatter
        .get("tags")
        .map(value_strings)
        .unwrap_or_default()
}

fn value_strings(value: &Value) -> Vec<String> {
    match value {
        Value::String(value) => vec![value.clone()],
        Value::Array(values) => values.iter().flat_map(value_strings).collect(),
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::split_frontmatter;
    use serde_json::Value;

    #[test]
    fn preserves_typed_and_nested_frontmatter_values() {
        let (frontmatter, body) = split_frontmatter("---\nenabled: true\ncount: 3\nmeta:\n  owner: team\ntags:\n  - '#rust'\n---\n# Title\n").unwrap();
        assert_eq!(frontmatter["enabled"], Value::Bool(true));
        assert_eq!(frontmatter["count"], Value::Number(3.into()));
        assert_eq!(frontmatter["meta"]["owner"], "team");
        assert_eq!(body, "# Title\n");
    }

    #[test]
    fn reports_malformed_frontmatter() {
        assert!(split_frontmatter("---\nkey: [broken\n---\nbody").is_err());
    }
}
