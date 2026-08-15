use thiserror::Error;

#[derive(Debug, Error)]
pub enum LlmError {
    #[error("provider is not configured")]
    ProviderNotConfigured,
    #[error("unknown provider")]
    UnknownProvider,
    #[error("provider configuration is invalid")]
    InvalidConfiguration,
    #[error("model is not configured")]
    ModelNotConfigured,
    #[error("credential is unavailable")]
    Credential(#[from] crate::modules::credentials::CredentialError),
    #[error("provider request failed")]
    Request(#[source] reqwest::Error),
    #[error("provider returned an invalid response: {0}")]
    Response(String),
}

impl LlmError {
    pub fn safe_message(&self) -> String {
        self.to_string()
    }
}
