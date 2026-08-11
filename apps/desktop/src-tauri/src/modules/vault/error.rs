use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("vault is not configured")]
    NotConfigured,
    #[error("invalid vault path")]
    InvalidPath,
    #[error("path is outside the vault")]
    PathOutsideVault,
    #[error("path not found: {0}")]
    NotFound(String),
    #[error("path already exists: {0}")]
    AlreadyExists(String),
    #[error("directory is not empty: {0}")]
    NotEmpty(String),
    #[error("invalid operation: {0}")]
    InvalidOperation(String),
    #[error("vault I/O failed")]
    Io,
}
