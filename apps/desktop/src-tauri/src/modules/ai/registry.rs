use super::provider::{AuthenticationType, ProviderDefinition};

pub fn definitions() -> Vec<ProviderDefinition> {
    vec![
        ProviderDefinition {
            id: "google".into(),
            name: "Google Gemini".into(),
            description: "Google Gemini models".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: Some("https://generativelanguage.googleapis.com".into()),
        },
        ProviderDefinition {
            id: "openai".into(),
            name: "OpenAI".into(),
            description: "OpenAI models".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: Some("https://api.openai.com/v1".into()),
        },
        ProviderDefinition {
            id: "anthropic".into(),
            name: "Anthropic".into(),
            description: "Anthropic Claude models".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: Some("https://api.anthropic.com".into()),
        },
        ProviderDefinition {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            description: "OpenRouter hosted models".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: Some("https://openrouter.ai/api/v1".into()),
        },
        ProviderDefinition {
            id: "grok".into(),
            name: "Grok".into(),
            description: "xAI Grok models".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: Some("https://api.x.ai/v1".into()),
        },
        ProviderDefinition {
            id: "ollama".into(),
            name: "Ollama".into(),
            description: "Local Ollama models".into(),
            authentication: AuthenticationType::None,
            default_base_url: Some("http://localhost:11434".into()),
        },
        ProviderDefinition {
            id: "openai-compatible".into(),
            name: "OpenAI Compatible".into(),
            description: "OpenAI-compatible endpoint".into(),
            authentication: AuthenticationType::ApiKey,
            default_base_url: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::definitions;

    #[test]
    fn registry_should_include_all_initial_providers() {
        let ids: Vec<_> = definitions()
            .into_iter()
            .map(|definition| definition.id)
            .collect();
        assert_eq!(
            ids,
            vec![
                "google",
                "openai",
                "anthropic",
                "openrouter",
                "grok",
                "ollama",
                "openai-compatible"
            ]
        );
    }
}
