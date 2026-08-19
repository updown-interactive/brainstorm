use super::{tokenizer::estimate_tokens, types::StructuredConversationState};
use crate::core::error::AppError;
use crate::modules::ai::{
    provider::LlmProvider,
    request::{LlmMessage, LlmRequest, LlmRole},
};
use crate::modules::conversation::model::MessageRow;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct CompactionResult {
    summary: String,
    #[serde(default)]
    state: StructuredConversationState,
}

pub async fn compact(
    provider: &dyn LlmProvider,
    model: &str,
    existing_summary: &str,
    existing_state: &StructuredConversationState,
    messages: &[MessageRow],
) -> Result<(String, StructuredConversationState, usize), AppError> {
    if messages.is_empty() {
        return Ok((existing_summary.to_string(), existing_state.clone(), 0));
    }
    let source = messages
        .iter()
        .map(|message| format!("{} [{}]: {}", message.role, message.id, message.content))
        .collect::<Vec<_>>()
        .join("\n\n");
    let prompt = "Compact the conversation for continuation. Return ONLY valid JSON with keys `summary` and `state`. Preserve the original objective, current goals and phase, explicit user decisions, constraints, relevant preferences, important facts, current plan, completed and unfinished work, open questions, technical decisions, referenced files/artifacts, and user corrections. Do not invent facts. Remove greetings, filler, repetition, obsolete reasoning, and irrelevant tool output. Mark uncertain information as an assumption in the summary. The state object must contain: objective, current_phase, goals, decisions, constraints, completed, pending, open_questions, important_facts, referenced_artifacts.";
    let response = provider
        .generate(LlmRequest {
            model: model.to_string(),
            messages: vec![
                LlmMessage { role: LlmRole::System, content: prompt.into() },
                LlmMessage {
                    role: LlmRole::User,
                    content: format!("Existing summary:\n{existing_summary}\n\nExisting state:\n{}\n\nMessages to compact:\n{source}", serde_json::to_string(existing_state).unwrap_or_default()),
                },
            ],
            tools: vec![],
            temperature: Some(0.0),
            max_tokens: Some(2_000),
        })
        .await
        .map_err(|error| AppError::Ai(error.safe_message()))?;
    let parsed = response
        .content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    let result = serde_json::from_str::<CompactionResult>(parsed)
        .map_err(|_| AppError::Ai("Context compaction returned invalid state".into()))?;
    if result.summary.trim().is_empty() {
        return Err(AppError::Ai(
            "Context compaction returned an empty summary".into(),
        ));
    }
    let token_count = estimate_tokens(&result.summary)
        + estimate_tokens(&serde_json::to_string(&result.state).unwrap_or_default());
    Ok((result.summary, result.state, token_count))
}
