use crate::core::error::AppError;
use serde::Deserialize;
use std::{fs, path::Path};

#[derive(Debug, Clone)]
pub struct AgentContext {
    pub id: String,
    pub name: String,
    pub role: String,
    pub priority: i64,
    pub allowed_tools: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct AgentManifest {
    id: Option<String>,
    name: Option<String>,
    role: Option<String>,
    priority: Option<i64>,
    #[serde(default)]
    allowed_tools: Vec<String>,
}

pub fn resolve(project_path: &str, agent_id: &str) -> Result<AgentContext, AppError> {
    let path = Path::new(project_path)
        .join(".brainstorm/agents")
        .join(agent_id)
        .join("agent.yaml");
    let content = fs::read_to_string(path)
        .map_err(|_| AppError::Tool(format!("agent '{agent_id}' is not configured")))?;
    let manifest: AgentManifest = serde_yaml::from_str(&content)
        .map_err(|_| AppError::Tool(format!("agent '{agent_id}' configuration is invalid")))?;
    Ok(AgentContext {
        id: manifest.id.unwrap_or_else(|| agent_id.to_string()),
        name: manifest.name.unwrap_or_else(|| agent_id.to_string()),
        role: manifest.role.unwrap_or_default(),
        priority: manifest.priority.unwrap_or_default(),
        allowed_tools: manifest.allowed_tools,
    })
}

pub fn can_use(agent: &AgentContext, tool_name: &str) -> bool {
    agent.allowed_tools.iter().any(|capability| {
        capability == tool_name
            || (capability.ends_with(".*")
                && tool_name.starts_with(capability.trim_end_matches("*")))
    })
}

#[cfg(test)]
mod tests {
    use super::{can_use, AgentContext};

    fn agent(allowed_tools: Vec<&str>) -> AgentContext {
        AgentContext {
            id: "reflex".into(),
            name: "Reflex".into(),
            role: "Quick Response".into(),
            priority: 90,
            allowed_tools: allowed_tools.into_iter().map(str::to_owned).collect(),
        }
    }

    #[test]
    fn wildcard_capability_matches_only_its_namespace() {
        assert!(can_use(&agent(vec!["search.*"]), "search.query"));
        assert!(!can_use(&agent(vec!["search.*"]), "web.fetch"));
    }
}
