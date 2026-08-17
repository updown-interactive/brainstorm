use crate::modules::ai::request::LlmMessage;

pub fn estimate_tokens(value: &str) -> usize {
    value.chars().count().div_ceil(4).max(1)
}

pub fn estimate_messages(messages: &[LlmMessage]) -> usize {
    messages
        .iter()
        .map(|message| estimate_tokens(&message.content) + 4)
        .sum()
}

#[cfg(test)]
mod tests {
    use super::{estimate_messages, estimate_tokens};
    use crate::modules::ai::request::{LlmMessage, LlmRole};

    #[test]
    fn estimate_tokens_is_conservative_for_short_text() {
        assert_eq!(estimate_tokens("1234"), 1);
        assert_eq!(estimate_tokens(""), 1);
    }

    #[test]
    fn estimate_messages_includes_per_message_overhead() {
        let messages = vec![LlmMessage {
            role: LlmRole::User,
            content: "1234".into(),
        }];
        assert_eq!(estimate_messages(&messages), 5);
    }
}
