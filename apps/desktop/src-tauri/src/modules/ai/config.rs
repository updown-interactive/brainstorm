use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProviderConfig {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub model: String,
    pub base_url: Option<String>,
    pub credential_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProviderConfigResponse {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub model: String,
    pub base_url: Option<String>,
    pub configured: bool,
}

impl From<ProviderConfig> for ProviderConfigResponse {
    fn from(config: ProviderConfig) -> Self {
        Self {
            id: config.id,
            provider_id: config.provider_id,
            name: config.name,
            model: config.model,
            base_url: config.base_url,
            configured: true,
        }
    }
}
