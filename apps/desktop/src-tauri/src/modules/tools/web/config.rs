use std::path::Path;

use serde::Deserialize;

use super::error::WebError;

#[derive(Debug, Clone, Deserialize)]
pub struct WebManifest {
    #[serde(default = "default_name")]
    pub name: String,
    #[serde(default)]
    pub permissions: WebPermissions,
    #[serde(default)]
    pub limits: WebLimits,
    #[serde(default)]
    pub client: WebClientConfig,
    #[serde(default)]
    pub extraction: WebExtractionConfig,
    #[serde(default)]
    pub tools: Vec<WebOperation>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WebPermissions {
    #[serde(default)]
    pub network: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WebLimits {
    #[serde(default = "default_timeout_seconds")]
    pub timeout_seconds: u64,
    #[serde(default = "default_max_response_size")]
    pub max_response_size: usize,
    #[serde(default = "default_max_extracted_text_size")]
    pub max_extracted_text_size: usize,
    #[serde(default = "default_max_redirects")]
    pub max_redirects: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WebClientConfig {
    #[serde(default = "default_user_agent")]
    pub user_agent: String,
    #[serde(default = "default_true")]
    pub follow_redirects: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WebExtractionConfig {
    #[serde(default = "default_content_selector")]
    pub content_selector: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WebOperation {
    pub name: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub description: String,
}

impl Default for WebManifest {
    fn default() -> Self {
        Self {
            name: default_name(),
            permissions: WebPermissions::default(),
            limits: WebLimits::default(),
            client: WebClientConfig::default(),
            extraction: WebExtractionConfig::default(),
            tools: vec![WebOperation {
                name: "web.fetch".into(),
                enabled: true,
                description: "Fetch a public web page and return readable content".into(),
            }],
        }
    }
}

impl Default for WebPermissions {
    fn default() -> Self {
        Self { network: false }
    }
}

impl Default for WebLimits {
    fn default() -> Self {
        Self {
            timeout_seconds: default_timeout_seconds(),
            max_response_size: default_max_response_size(),
            max_extracted_text_size: default_max_extracted_text_size(),
            max_redirects: default_max_redirects(),
        }
    }
}

impl Default for WebClientConfig {
    fn default() -> Self {
        Self {
            user_agent: default_user_agent(),
            follow_redirects: true,
        }
    }
}

impl Default for WebExtractionConfig {
    fn default() -> Self {
        Self {
            content_selector: default_content_selector(),
        }
    }
}

impl WebManifest {
    pub fn load(project_path: &Path) -> Result<Self, WebError> {
        let path = project_path.join(".brainstorm/tools/web/manifest.yaml");
        let content = std::fs::read_to_string(path).map_err(|_| WebError::Configuration)?;
        serde_yaml::from_str(&content).map_err(|_| WebError::Configuration)
    }

    pub fn enables(&self, operation: &str) -> bool {
        self.tools
            .iter()
            .any(|tool| tool.name == operation && tool.enabled)
    }
}

fn default_name() -> String {
    "web".into()
}
fn default_timeout_seconds() -> u64 {
    20
}
fn default_max_response_size() -> usize {
    10 * 1024 * 1024
}
fn default_max_extracted_text_size() -> usize {
    512 * 1024
}
fn default_max_redirects() -> usize {
    5
}
fn default_user_agent() -> String {
    "Brainstorm/0.1 web.fetch".into()
}
fn default_content_selector() -> String {
    "body :not(script):not(style):not(noscript):not(nav)".into()
}
fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::WebManifest;

    #[test]
    fn parses_operation_and_runtime_settings_from_manifest() {
        let manifest: WebManifest = serde_yaml::from_str(
            r#"
name: web
permissions:
  network: true
limits:
  timeout_seconds: 7
  max_response_size: 1000
tools:
  - name: web.fetch
    enabled: true
"#,
        )
        .unwrap();
        assert!(manifest.permissions.network);
        assert_eq!(manifest.limits.timeout_seconds, 7);
        assert!(manifest.enables("web.fetch"));
        assert!(!manifest.enables("web.search"));
    }
}
