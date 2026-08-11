use thiserror::Error;

#[derive(Debug, Error)]
pub enum MarkdownError {
    #[error("document not found: {0}")]
    DocumentNotFound(String),
    #[error("invalid document path")]
    InvalidPath,
    #[error("document path is outside the vault")]
    PathOutsideVault,
    #[error("vault read permission is not granted")]
    PermissionDenied,
    #[error("invalid YAML frontmatter: {0}")]
    InvalidFrontmatter(String),
    #[error("unsupported document type")]
    UnsupportedDocument,
    #[error("vault error: {0}")]
    Vault(String),
}
