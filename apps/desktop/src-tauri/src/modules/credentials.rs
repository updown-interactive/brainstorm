use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Key, Nonce};
use async_trait::async_trait;
use rand::RngCore;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CredentialError {
    #[error("credential storage failed")]
    Storage(#[source] sqlx::Error),
    #[error("credential encryption failed")]
    Encryption,
    #[error("credential is not configured")]
    Missing,
}

#[async_trait]
pub trait CredentialStore: Send + Sync {
    async fn set(&self, credential_id: &str, secret: &str) -> Result<(), CredentialError>;
    async fn get(&self, credential_id: &str) -> Result<Option<String>, CredentialError>;
    async fn delete(&self, credential_id: &str) -> Result<(), CredentialError>;
}

pub struct EncryptedDatabaseStore { pool: SqlitePool, key: [u8; 32] }

impl EncryptedDatabaseStore {
    pub async fn initialize(pool: &SqlitePool) -> Result<(), CredentialError> {
        sqlx::query("CREATE TABLE IF NOT EXISTS llm_credentials (credential_id TEXT PRIMARY KEY NOT NULL, ciphertext BLOB NOT NULL, nonce BLOB NOT NULL, updated_at INTEGER NOT NULL)").execute(pool).await.map_err(CredentialError::Storage)?;
        Ok(())
    }

    pub fn new(pool: SqlitePool) -> Self {
        let machine_identity = machine_uid::get().unwrap_or_else(|_| "brainstorm-local-machine".to_string());
        let mut digest = Sha256::new();
        digest.update(b"brainstorm-llm-credentials-v1");
        digest.update(machine_identity.as_bytes());
        Self { pool, key: digest.finalize().into() }
    }

    fn cipher(&self) -> Aes256Gcm { Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&self.key)) }
}

#[async_trait]
impl CredentialStore for EncryptedDatabaseStore {
    async fn set(&self, credential_id: &str, secret: &str) -> Result<(), CredentialError> {
        let mut nonce = [0_u8; 12]; rand::thread_rng().fill_bytes(&mut nonce);
        let ciphertext = self.cipher().encrypt(Nonce::from_slice(&nonce), secret.as_bytes()).map_err(|_| CredentialError::Encryption)?;
        sqlx::query("INSERT INTO llm_credentials (credential_id, ciphertext, nonce, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(credential_id) DO UPDATE SET ciphertext = excluded.ciphertext, nonce = excluded.nonce, updated_at = excluded.updated_at").bind(credential_id).bind(ciphertext).bind(nonce.to_vec()).bind(now()).execute(&self.pool).await.map_err(CredentialError::Storage)?;
        Ok(())
    }

    async fn get(&self, credential_id: &str) -> Result<Option<String>, CredentialError> {
        let row = sqlx::query_as::<_, (Vec<u8>, Vec<u8>)>("SELECT ciphertext, nonce FROM llm_credentials WHERE credential_id = ?").bind(credential_id).fetch_optional(&self.pool).await.map_err(CredentialError::Storage)?;
        let Some((ciphertext, nonce)) = row else { return Ok(None); };
        let plaintext = self.cipher().decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref()).map_err(|_| CredentialError::Encryption)?;
        String::from_utf8(plaintext).map(Some).map_err(|_| CredentialError::Encryption)
    }

    async fn delete(&self, credential_id: &str) -> Result<(), CredentialError> {
        sqlx::query("DELETE FROM llm_credentials WHERE credential_id = ?").bind(credential_id).execute(&self.pool).await.map_err(CredentialError::Storage)?;
        Ok(())
    }
}

pub struct CredentialService { store: Arc<dyn CredentialStore> }

impl CredentialService {
    pub fn new(store: Arc<dyn CredentialStore>) -> Self { Self { store } }
    pub async fn save_api_key(&self, credential_id: &str, api_key: &str) -> Result<(), CredentialError> { if api_key.trim().is_empty() { return Err(CredentialError::Missing); } self.store.set(credential_id, api_key.trim()).await }
    pub async fn get_api_key(&self, credential_id: &str) -> Result<String, CredentialError> { self.store.get(credential_id).await?.ok_or(CredentialError::Missing) }
    pub async fn delete(&self, credential_id: &str) -> Result<(), CredentialError> { self.store.delete(credential_id).await }
}

fn now() -> i64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or_default() }
