use crate::core::error::AppError;

#[derive(Debug, Clone, Copy)]
pub struct PermissionSet {
    pub network: bool,
}

impl PermissionSet {
    pub const fn native_defaults() -> Self {
        Self { network: true }
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
}
