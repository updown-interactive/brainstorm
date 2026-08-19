#[derive(Debug, Clone, Copy)]
pub struct ModelCapabilities {
    pub context_window_tokens: usize,
    pub max_output_tokens: usize,
    pub compaction_threshold: f32,
    pub safety_margin_tokens: usize,
}

pub fn for_model(provider_id: &str, model: &str) -> ModelCapabilities {
    let model_name = model.to_ascii_lowercase();
    let context_window_tokens =
        if model_name.contains("gemini-1.5") || model_name.contains("gemini-2") {
            1_000_000
        } else if model_name.contains("claude") {
            200_000
        } else if model_name.contains("gpt-4.1") || model_name.contains("gpt-5") {
            128_000
        } else if provider_id == "ollama" {
            32_000
        } else {
            64_000
        };
    ModelCapabilities {
        context_window_tokens,
        max_output_tokens: 8_192,
        compaction_threshold: 0.80,
        safety_margin_tokens: 1_024,
    }
}

#[cfg(test)]
mod tests {
    use super::for_model;

    #[test]
    fn capabilities_are_provider_and_model_aware() {
        assert!(for_model("google", "gemini-2.0-flash").context_window_tokens > 500_000);
        assert_eq!(
            for_model("ollama", "local-model").context_window_tokens,
            32_000
        );
        assert_eq!(
            for_model("openai", "unknown-model").context_window_tokens,
            64_000
        );
    }
}
