use thiserror::Error;

#[derive(Debug, Error)]
pub enum WebError {
    #[error("invalid URL")]
    InvalidUrl,
    #[error("unsupported URL scheme: {0}")]
    UnsupportedScheme(String),
    #[error("blocked host")]
    BlockedHost,
    #[error("blocked network address")]
    BlockedAddress,
    #[error("request timed out")]
    RequestTimeout,
    #[error("network request failed")]
    Network,
    #[error("HTTP request failed with status {0}")]
    HttpStatus(u16),
    #[error("response exceeded the configured size limit")]
    ResponseTooLarge,
    #[error("unsupported content type: {0}")]
    UnsupportedContentType(String),
    #[error("could not extract readable content")]
    Extraction,
    #[error("web tool configuration is missing or invalid")]
    Configuration,
}
