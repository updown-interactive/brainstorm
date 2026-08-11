use crate::core::error::AppError;

#[derive(Debug, Clone, Copy)]
pub struct PermissionSet {
    pub network: bool,
    pub vault_read: bool,
    pub vault_write: bool,
}

impl PermissionSet {
    pub const fn native_defaults() -> Self {
        Self {
            network: true,
            vault_read: true,
            vault_write: true,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ToolRuntime {
    permissions: PermissionSet,
}

impl ToolRuntime {
    pub const fn new(permissions: PermissionSet) -> Self {
        Self { permissions }
    }

    pub fn require_network(&self) -> Result<(), AppError> {
        if self.permissions.network {
            Ok(())
        } else {
            Err(AppError::Tool("network permission is not granted".into()))
        }
    }

    pub fn require_vault_read(&self) -> Result<(), AppError> {
        if self.permissions.vault_read {
            Ok(())
        } else {
            Err(AppError::Tool(
                "vault read permission is not granted".into(),
            ))
        }
    }

    pub fn require_vault_write(&self) -> Result<(), AppError> {
        if self.permissions.vault_write {
            Ok(())
        } else {
            Err(AppError::Tool(
                "vault write permission is not granted".into(),
            ))
        }
    }
}
