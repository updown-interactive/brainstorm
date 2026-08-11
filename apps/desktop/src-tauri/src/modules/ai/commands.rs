use super::{
    config::{ProviderConfig, ProviderConfigResponse},
    error::LlmError,
    factory::ProviderFactory,
    provider::{AddProviderRequest, ProviderDefinition, UpdateProviderRequest},
    registry,
    response::{ConnectionTestResult, LlmModel},
};
use crate::core::{db::DbState, error::AppError};
use crate::modules::credentials::{CredentialService, EncryptedDatabaseStore};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Instant;
use tauri::State;

pub struct AiState {
    pub credentials: Arc<CredentialService>,
    pub factory: Arc<ProviderFactory>,
}

pub async fn init(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("CREATE TABLE IF NOT EXISTS llm_provider_configs (id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, name TEXT NOT NULL, model TEXT NOT NULL, base_url TEXT, credential_id TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)").execute(pool).await?;
    EncryptedDatabaseStore::initialize(pool)
        .await
        .map_err(|error| sqlx::Error::Protocol(error.to_string()))?;
    Ok(())
}

pub fn state(pool: SqlitePool) -> AiState {
    let credentials = Arc::new(CredentialService::new(Arc::new(
        EncryptedDatabaseStore::new(pool),
    )));
    let factory = Arc::new(ProviderFactory::new(credentials.clone()));
    AiState {
        credentials,
        factory,
    }
}

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}
fn map_error(error: LlmError) -> AppError {
    AppError::Ai(error.safe_message())
}
async fn get_config(pool: &SqlitePool, id: &str) -> Result<ProviderConfig, AppError> {
    sqlx::query_as::<_, ProviderConfig>("SELECT id, provider_id, name, model, base_url, credential_id, created_at, updated_at FROM llm_provider_configs WHERE id = ?")
        .bind(id).fetch_optional(pool).await?.ok_or(AppError::Ai("provider configuration not found".into()))
}

#[tauri::command]
pub fn ai_list_providers() -> Vec<ProviderDefinition> {
    registry::definitions()
}

#[tauri::command]
pub async fn ai_get_configured_providers(
    state: State<'_, DbState>,
) -> Result<Vec<ProviderConfigResponse>, AppError> {
    let configs = sqlx::query_as::<_, ProviderConfig>("SELECT id, provider_id, name, model, base_url, credential_id, created_at, updated_at FROM llm_provider_configs ORDER BY name")
        .fetch_all(&state.pool).await?;
    Ok(configs
        .into_iter()
        .map(ProviderConfigResponse::from)
        .collect())
}

#[tauri::command]
pub async fn ai_add_provider(
    request: AddProviderRequest,
    db: State<'_, DbState>,
    ai: State<'_, AiState>,
) -> Result<ProviderConfigResponse, AppError> {
    let definition = registry::definitions()
        .into_iter()
        .find(|item| item.id == request.provider_id)
        .ok_or(AppError::Ai("unknown provider".into()))?;
    if request.model.trim().is_empty() || request.name.trim().is_empty() {
        return Err(AppError::Ai("provider configuration is invalid".into()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    let credential_id = format!("brainstorm.llm.{}.{}", definition.id, id);
    if matches!(
        definition.authentication,
        super::provider::AuthenticationType::ApiKey
    ) {
        ai.credentials
            .save_api_key(&credential_id, request.api_key.as_deref().unwrap_or(""))
            .await
            .map_err(|error| AppError::Ai(error.to_string()))?;
    }
    let timestamp = now();
    let config = ProviderConfig {
        id,
        provider_id: definition.id,
        name: request.name,
        model: request.model,
        base_url: request.base_url.or(definition.default_base_url),
        credential_id,
        created_at: timestamp,
        updated_at: timestamp,
    };
    sqlx::query("INSERT INTO llm_provider_configs (id, provider_id, name, model, base_url, credential_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(&config.id).bind(&config.provider_id).bind(&config.name).bind(&config.model).bind(&config.base_url).bind(&config.credential_id).bind(config.created_at).bind(config.updated_at).execute(&db.pool).await?;
    Ok(config.into())
}

#[tauri::command]
pub async fn ai_update_provider(
    request: UpdateProviderRequest,
    db: State<'_, DbState>,
    ai: State<'_, AiState>,
) -> Result<ProviderConfigResponse, AppError> {
    let mut config = get_config(&db.pool, &request.id).await?;
    if let Some(api_key) = request.api_key {
        ai.credentials
            .save_api_key(&config.credential_id, &api_key)
            .await
            .map_err(|error| AppError::Ai(error.to_string()))?;
    }
    if let Some(name) = request.name {
        config.name = name;
    }
    if let Some(model) = request.model {
        config.model = model;
    }
    if request.base_url.is_some() {
        config.base_url = request.base_url;
    }
    config.updated_at = now();
    sqlx::query("UPDATE llm_provider_configs SET name = ?, model = ?, base_url = ?, updated_at = ? WHERE id = ?").bind(&config.name).bind(&config.model).bind(&config.base_url).bind(config.updated_at).bind(&config.id).execute(&db.pool).await?;
    Ok(config.into())
}

#[tauri::command]
pub async fn ai_remove_provider(
    id: String,
    db: State<'_, DbState>,
    ai: State<'_, AiState>,
) -> Result<(), AppError> {
    let config = get_config(&db.pool, &id).await?;
    sqlx::query("DELETE FROM llm_provider_configs WHERE id = ?")
        .bind(&id)
        .execute(&db.pool)
        .await?;
    ai.credentials
        .delete(&config.credential_id)
        .await
        .map_err(|error| AppError::Ai(error.to_string()))
}

#[tauri::command]
pub async fn ai_test_provider(
    id: String,
    db: State<'_, DbState>,
    ai: State<'_, AiState>,
) -> Result<ConnectionTestResult, AppError> {
    let config = get_config(&db.pool, &id).await?;
    let provider = ai.factory.create(&config).await.map_err(map_error)?;
    let started = Instant::now();
    match provider.validate().await {
        Ok(()) => Ok(ConnectionTestResult {
            success: true,
            provider: config.provider_id,
            model: config.model,
            latency_ms: Some(started.elapsed().as_millis() as u64),
            error: None,
        }),
        Err(error) => Ok(ConnectionTestResult {
            success: false,
            provider: config.provider_id,
            model: config.model,
            latency_ms: Some(started.elapsed().as_millis() as u64),
            error: Some(super::response::SafeProviderError {
                code: "provider_error".into(),
                message: error.safe_message(),
            }),
        }),
    }
}

#[tauri::command]
pub async fn ai_list_models(
    id: String,
    db: State<'_, DbState>,
    ai: State<'_, AiState>,
) -> Result<Vec<LlmModel>, AppError> {
    let config = get_config(&db.pool, &id).await?;
    ai.factory
        .create(&config)
        .await
        .map_err(map_error)?
        .models()
        .await
        .map_err(map_error)
}
