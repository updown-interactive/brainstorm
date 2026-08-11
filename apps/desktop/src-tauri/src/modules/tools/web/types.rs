use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct WebFetchInput {
    pub url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct WebFetchResult {
    pub success: bool,
    pub url: String,
    pub status: u16,
    pub content_type: String,
    pub title: Option<String>,
    pub content: String,
}
