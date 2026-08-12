use crate::core::error::AppError;
use crate::modules::ai::ToolCall;
use crate::modules::tools::{markdown, registry, search, vault, web};
use serde_json::{json, Value};

pub async fn execute(call: &ToolCall, project_path: &str) -> Result<Value, AppError> {
    eprintln!(
        "[chat-tool] start name={} project={}",
        call.name, project_path
    );
    if !registry::contains(&call.name) {
        return Err(AppError::Tool(format!(
            "tool is not registered: {}",
            call.name
        )));
    }
    let mut arguments = call.arguments.clone();
    if !arguments.is_object() {
        return Err(AppError::Tool("tool arguments must be an object".into()));
    }
    if let Some(value) = arguments.get_mut("recursive") {
        if let Some(text) = value.as_str() {
            if let Ok(parsed) = text.parse::<bool>() {
                *value = json!(parsed);
            }
        }
    }
    if call.name == "vault.create_file" {
        arguments["recursive"] = json!(true);
    }
    arguments["operation"] = json!(call.name);
    arguments["project_path"] = json!(project_path);
    let result = match call.name.as_str() {
        name if name.starts_with("search.") => {
            search::commands::execute(
                serde_json::from_value(arguments).map_err(invalid_arguments)?,
                &search::commands::SearchState::default().runtime,
            )
            .await
        }
        name if name.starts_with("markdown.") => {
            markdown::commands::execute(
                serde_json::from_value(arguments).map_err(invalid_arguments)?,
                &markdown::commands::MarkdownState::default().runtime,
            )
            .await
        }
        name if name.starts_with("vault.") => {
            vault::vault::execute(
                serde_json::from_value(arguments).map_err(invalid_arguments)?,
                &vault::vault::VaultState::default().runtime,
            )
            .await
        }
        "web.fetch" => {
            let request = web::commands::WebFetchRequest {
                url: arguments["url"]
                    .as_str()
                    .ok_or_else(|| invalid_arguments("url is required"))?
                    .into(),
                project_path: project_path.into(),
            };
            let state = web::commands::WebState::new()?;
            web::commands::execute(request, &state.tool, &state.runtime)
                .await
                .map(|result| {
                    serde_json::to_value(result).unwrap_or_else(|_| json!({"success":false}))
                })
        }
        _ => Err(AppError::Tool(format!("unsupported tool: {}", call.name))),
    };
    match &result {
        Ok(_) => eprintln!("[chat-tool] success name={}", call.name),
        Err(error) => eprintln!("[chat-tool] failure name={} error={}", call.name, error),
    }
    result
}

fn invalid_arguments(error: impl std::fmt::Display) -> AppError {
    AppError::Tool(format!("invalid tool arguments: {error}"))
}
