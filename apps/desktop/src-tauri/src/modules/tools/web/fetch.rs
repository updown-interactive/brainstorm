use serde_json::Value;

use super::{
    client::WebClient,
    config::WebManifest,
    types::{WebFetchInput, WebFetchResult},
};
use crate::core::error::AppError;

pub struct WebTool {
    client: WebClient,
}

impl WebTool {
    pub fn new(client: WebClient) -> Self {
        Self { client }
    }

    pub async fn execute(
        &self,
        arguments: Value,
        config: &WebManifest,
    ) -> Result<WebFetchResult, AppError> {
        let input: WebFetchInput = serde_json::from_value(arguments)
            .map_err(|_| AppError::Tool("web.fetch requires a url string".into()))?;
        self.client
            .fetch(&input.url, config)
            .await
            .map_err(|error| AppError::Tool(error.to_string()))
    }
}
