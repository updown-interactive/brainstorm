use async_trait::async_trait;
use futures_util::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

use super::{
    error::LlmError,
    request::LlmRequest,
    response::{LlmModel, LlmResponse},
};

pub type LlmStream = Pin<Box<dyn Stream<Item = Result<String, LlmError>> + Send>>;

#[derive(Debug, Clone, Serialize)]
pub struct ProviderDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub authentication: AuthenticationType,
    pub default_base_url: Option<String>,
    pub models: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthenticationType {
    ApiKey,
    None,
}

#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn generate(&self, request: LlmRequest) -> Result<LlmResponse, LlmError>;
    async fn stream(&self, request: LlmRequest) -> Result<LlmStream, LlmError> {
        let response = self.generate(request).await?;
        Ok(Box::pin(futures_util::stream::once(async move {
            Ok(response.content)
        })))
    }
    async fn validate(&self) -> Result<(), LlmError>;
    async fn models(&self) -> Result<Vec<LlmModel>, LlmError>;
}

#[derive(Clone, Serialize, Deserialize)]
pub struct AddProviderRequest {
    pub provider_id: String,
    pub name: String,
    pub api_key: Option<String>,
    pub model: String,
    pub base_url: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UpdateProviderRequest {
    pub id: String,
    pub name: Option<String>,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
}
