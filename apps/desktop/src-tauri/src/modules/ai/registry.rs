use super::provider::{AuthenticationType, ProviderDefinition};

fn provider(
    id: &str,
    name: &str,
    description: &str,
    base_url: Option<&str>,
    models: &[&str],
) -> ProviderDefinition {
    ProviderDefinition {
        id: id.into(),
        name: name.into(),
        description: description.into(),
        authentication: AuthenticationType::ApiKey,
        default_base_url: base_url.map(str::to_owned),
        models: models.iter().map(|model| (*model).into()).collect(),
    }
}

pub fn definitions() -> Vec<ProviderDefinition> {
    vec![
        provider(
            "openai",
            "OpenAI",
            "OpenAI Responses models",
            Some("https://api.openai.com/v1"),
            &["gpt-5.6", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"],
        ),
        provider(
            "anthropic",
            "Anthropic",
            "Anthropic Messages models",
            Some("https://api.anthropic.com"),
            &[
                "claude-opus-5",
                "claude-sonnet-5",
                "claude-haiku-4-5-20251001",
            ],
        ),
        provider(
            "google",
            "Google Gemini",
            "Gemini models",
            Some("https://generativelanguage.googleapis.com/v1beta"),
            &[
                "gemini-3.7-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
                "gemini-3.1-pro-preview",
                "gemini-3-flash-preview",
            ],
        ),
        provider(
            "xai",
            "xAI",
            "OpenAI-compatible xAI models",
            Some("https://api.x.ai/v1"),
            &["grok-4.6", "grok-4.5"],
        ),
        provider(
            "openrouter",
            "OpenRouter",
            "OpenAI-compatible routed models",
            Some("https://openrouter.ai/api/v1"),
            &["openrouter/free"],
        ),
        provider(
            "groq",
            "Groq",
            "OpenAI-compatible Groq models; catalogue is discovered by the API",
            Some("https://api.groq.com/openai/v1"),
            &[],
        ),
        provider(
            "mistral",
            "Mistral",
            "OpenAI-like Mistral models; catalogue is discovered by the API",
            Some("https://api.mistral.ai/v1"),
            &[],
        ),
        provider(
            "deepseek",
            "DeepSeek",
            "OpenAI-compatible DeepSeek models",
            Some("https://api.deepseek.com"),
            &["deepseek-v4-pro", "deepseek-v4-flash"],
        ),
        provider(
            "cohere",
            "Cohere",
            "Cohere Command models; catalogue is discovered by the API",
            Some("https://api.cohere.com/v2"),
            &[],
        ),
        provider(
            "together",
            "Together AI",
            "OpenAI-compatible hosted open models; catalogue is discovered by the API",
            Some("https://api.together.xyz/v1"),
            &[],
        ),
        provider(
            "fireworks",
            "Fireworks AI",
            "OpenAI-compatible hosted open models; catalogue is discovered by the API",
            Some("https://api.fireworks.ai/inference/v1"),
            &[],
        ),
        provider(
            "cerebras",
            "Cerebras",
            "OpenAI-compatible Cerebras models; catalogue is discovered by the API",
            Some("https://api.cerebras.ai/v1"),
            &[],
        ),
        ProviderDefinition {
            id: "ollama".into(),
            name: "Ollama".into(),
            description: "Local Ollama models".into(),
            authentication: AuthenticationType::None,
            default_base_url: Some("http://localhost:11434".into()),
            models: Vec::new(),
        },
        provider(
            "openai-compatible",
            "OpenAI Compatible",
            "Custom OpenAI-compatible endpoint",
            None,
            &[],
        ),
    ]
}
