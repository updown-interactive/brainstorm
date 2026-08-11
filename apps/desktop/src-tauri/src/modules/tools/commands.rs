use super::{agent, registry, runtime::ToolRuntime};
use crate::core::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::State;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCall {
    pub name: String,
    #[serde(default)]
    pub arguments: Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolSchema {
    pub name: String,
    pub description: String,
    pub parameters: Value,
    pub permissions: Vec<String>,
}

#[tauri::command]
pub fn tool_list_for_agent(
    project_path: String,
    agent_id: String,
) -> Result<Vec<ToolSchema>, AppError> {
    let agent = agent::resolve(&project_path, &agent_id)?;
    Ok(registry::list()
        .into_iter()
        .filter(|definition| agent::can_use(&agent, definition.name))
        .map(schema)
        .collect())
}

#[tauri::command]
pub async fn tool_execute(
    call: ToolCall,
    project_path: String,
    agent_id: String,
    web: State<'_, crate::modules::tools::web::commands::WebState>,
) -> Result<Value, AppError> {
    let agent = agent::resolve(&project_path, &agent_id)?;
    let runtime = ToolRuntime::new(super::PermissionSet::native_defaults());
    let definition = runtime.authorize(&agent, &call.name)?;
    let arguments = arguments_with_project_path(call.arguments, &project_path)?;

    match call.name.as_str() {
        name if name.starts_with("vault.") => {
            super::vault::vault::execute(
                serde_json::from_value(with_operation(arguments, &call.name))
                    .map_err(|_| AppError::Tool("invalid vault tool arguments".into()))?,
                &runtime,
            )
            .await
        }
        name if name.starts_with("markdown.") => {
            super::markdown::commands::execute(
                serde_json::from_value(with_operation(arguments, &call.name))
                    .map_err(|_| AppError::Tool("invalid markdown tool arguments".into()))?,
                &runtime,
            )
            .await
        }
        "search.query" => {
            super::search::commands::execute(
                serde_json::from_value(with_operation(arguments, &call.name))
                    .map_err(|_| AppError::Tool("invalid search tool arguments".into()))?,
                &runtime,
            )
            .await
        }
        "web.fetch" => {
            let result = super::web::commands::execute(
                serde_json::from_value(Value::Object(arguments))
                    .map_err(|_| AppError::Tool("invalid web tool arguments".into()))?,
                &web.tool,
                &runtime,
            )
            .await?;
            serde_json::to_value(result)
                .map_err(|_| AppError::Tool("web tool returned an invalid result".into()))
        }
        _ => Err(AppError::Tool(format!(
            "tool '{}' is not executable",
            definition.name
        ))),
    }
}

fn schema(definition: registry::ToolDefinition) -> ToolSchema {
    ToolSchema {
        name: definition.name.to_string(),
        description: definition.description.to_string(),
        parameters: definition.schema(),
        permissions: definition
            .permissions
            .iter()
            .map(|permission| (*permission).to_string())
            .collect(),
    }
}

fn arguments_with_project_path(
    arguments: Value,
    project_path: &str,
) -> Result<Map<String, Value>, AppError> {
    let Value::Object(mut object) = arguments else {
        return Err(AppError::Tool(
            "tool arguments must be a JSON object".into(),
        ));
    };
    object.insert("project_path".into(), Value::String(project_path.into()));
    Ok(object)
}

fn with_operation(mut arguments: Map<String, Value>, operation: &str) -> Value {
    arguments.insert("operation".into(), Value::String(operation.into()));
    Value::Object(arguments)
}
