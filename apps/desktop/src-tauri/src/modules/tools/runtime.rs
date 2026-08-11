use super::{agent, registry};
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

    pub fn authorize(
        &self,
        agent_context: &agent::AgentContext,
        tool_name: &str,
    ) -> Result<registry::ToolDefinition, AppError> {
        let definition = registry::get(tool_name)
            .ok_or_else(|| AppError::Tool(format!("tool '{tool_name}' is not registered")))?;
        if !agent::can_use(agent_context, tool_name) {
            return Err(AppError::Tool(format!(
                "agent '{}' is not authorized to use '{tool_name}'",
                agent_context.id
            )));
        }
        for permission in definition.permissions {
            match *permission {
                "network" => self.require_network()?,
                "vault_read" => self.require_vault_read()?,
                "vault_write" => self.require_vault_write()?,
                unknown => {
                    return Err(AppError::Tool(format!(
                        "unknown tool permission '{unknown}'"
                    )))
                }
            }
        }
        Ok(definition)
    }
}
