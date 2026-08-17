use super::{
    config::ProviderConfig,
    error::LlmError,
    provider::LlmProvider,
    providers::{GeminiProvider, HttpProvider},
};
use crate::modules::credentials::CredentialService;
use reqwest::Client;
use std::sync::Arc;

pub struct ProviderFactory {
    credentials: Arc<CredentialService>,
    client: Client,
}
impl ProviderFactory {
    pub fn new(credentials: Arc<CredentialService>) -> Self {
        Self {
            credentials,
            client: Client::new(),
        }
    }
    pub async fn create(&self, config: &ProviderConfig) -> Result<Box<dyn LlmProvider>, LlmError> {
        let api_key = if config.provider_id == "ollama" {
            None
        } else {
            Some(self.credentials.get_api_key(&config.credential_id).await?)
        };
        let base_url = config
            .base_url
            .clone()
            .ok_or(LlmError::InvalidConfiguration)?;
        let http = HttpProvider {
            id: config.provider_id.clone(),
            base_url,
            model: config.model.clone(),
            api_key,
            client: self.client.clone(),
        };
        if config.provider_id == "google" {
            Ok(Box::new(GeminiProvider(Arc::new(http))))
        } else if [
            "openai",
            "anthropic",
            "openrouter",
            "groq",
            "grok",
            "xai",
            "mistral",
            "deepseek",
            "cohere",
            "together",
            "fireworks",
            "cerebras",
            "ollama",
            "openai-compatible",
        ]
        .contains(&config.provider_id.as_str())
        {
            Ok(Box::new(http))
        } else {
            Err(LlmError::UnknownProvider)
        }
    }
}
