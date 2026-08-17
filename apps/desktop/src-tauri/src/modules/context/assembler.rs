use super::{
    capabilities::for_model,
    compactor, retriever,
    tokenizer::{estimate_messages, estimate_tokens},
    types::{ContextAssembly, StructuredConversationState, TokenUsage},
};
use crate::core::error::AppError;
use crate::modules::ai::{
    provider::LlmProvider,
    request::{LlmMessage, LlmRole, ToolDefinition},
};
use crate::modules::conversation::model::MessageRow;
use sqlx::SqlitePool;

pub struct ContextManager;

pub struct ContextRequest<'a> {
    pub conversation_id: &'a str,
    pub provider_id: &'a str,
    pub model: &'a str,
    pub system_instruction: &'a str,
    pub query: &'a str,
    pub tools: &'a [ToolDefinition],
}

impl ContextManager {
    pub async fn assemble(
        pool: &SqlitePool,
        provider: &dyn LlmProvider,
        request: ContextRequest<'_>,
    ) -> Result<ContextAssembly, AppError> {
        let capabilities = for_model(request.provider_id, request.model);
        let state = load_state(pool, request.conversation_id).await?;
        let recent = recent_messages(pool, request.conversation_id, 80).await?;
        let oldest_recent = recent.first();
        let mut summary = state
            .as_ref()
            .map(|value| value.summary.clone())
            .unwrap_or_default();
        let mut structured = state
            .as_ref()
            .map(|value| value.structured_state.clone())
            .unwrap_or_default();
        let mut snapshot_version = state
            .as_ref()
            .and_then(|value| value.version.checked_sub(0));
        let mut compaction_performed = false;
        let uncompacted = load_uncompacted_messages(
            pool,
            request.conversation_id,
            oldest_recent,
            state
                .as_ref()
                .and_then(|value| value.compacted_through_created_at),
            state
                .as_ref()
                .and_then(|value| value.compacted_through_message_id.as_deref()),
        )
        .await?;
        let raw_old_tokens = uncompacted
            .iter()
            .map(|message| estimate_tokens(&message.content))
            .sum::<usize>();
        let reserved = capabilities.max_output_tokens + capabilities.safety_margin_tokens;
        let system_tokens = estimate_tokens(request.system_instruction)
            + request
                .tools
                .iter()
                .map(|tool| {
                    estimate_tokens(&tool.description)
                        + estimate_tokens(&tool.parameters.to_string())
                })
                .sum::<usize>();
        let threshold_tokens = ((capabilities.context_window_tokens as f32)
            * capabilities.compaction_threshold) as usize;
        if !uncompacted.is_empty() && raw_old_tokens + system_tokens > threshold_tokens {
            if let Ok((new_summary, new_state, compacted_tokens)) =
                compactor::compact(provider, request.model, &summary, &structured, &uncompacted)
                    .await
            {
                let end = uncompacted.last();
                let version = state.as_ref().map_or(1, |value| value.version + 1);
                let persisted = persist_compaction(
                    pool,
                    CompactionRecord {
                        conversation_id: request.conversation_id,
                        version,
                        summary: &new_summary,
                        state: &new_state,
                        start: uncompacted.first(),
                        end,
                        token_count: compacted_tokens,
                    },
                )
                .await?;
                summary = new_summary;
                structured = new_state;
                snapshot_version = Some(version);
                compaction_performed = persisted;
            }
        }
        let available = capabilities
            .context_window_tokens
            .saturating_sub(system_tokens + reserved);
        let recent_budget = available.saturating_mul(55) / 100;
        let retrieved_budget = available.saturating_mul(20) / 100;
        let retrieved = retriever::retrieve(
            pool,
            request.conversation_id,
            request.query,
            oldest_recent.map(|message| message.created_at),
            retrieved_budget,
        )
        .await
        .unwrap_or_default();
        let recent_messages = select_recent(&recent, recent_budget);
        let summary_message = summary_message(&summary, &structured);
        let mut messages = vec![LlmMessage {
            role: LlmRole::System,
            content: request.system_instruction.to_string(),
        }];
        if let Some(message) = summary_message {
            messages.push(message);
        }
        let mut seen = std::collections::HashSet::new();
        for item in retrieved
            .iter()
            .filter(|item| seen.insert(item.source_message_id.clone()))
        {
            messages.push(LlmMessage {
                role: LlmRole::System,
                content: format!("Relevant historical context:\n{}", item.content),
            });
        }
        let recent_message_tokens = recent_messages
            .iter()
            .map(|message| estimate_tokens(&message.content))
            .sum();
        messages.extend(recent_messages.into_iter().map(to_llm_message));
        let input_tokens = estimate_messages(&messages);
        let usage = TokenUsage {
            system_tokens,
            summary_tokens: estimate_tokens(&summary),
            recent_message_tokens,
            retrieved_context_tokens: retrieved
                .iter()
                .map(|item| estimate_tokens(&item.content))
                .sum(),
            tool_tokens: system_tokens.saturating_sub(estimate_tokens(request.system_instruction)),
            input_tokens,
            reserved_output_tokens: reserved,
            model_context_limit: capabilities.context_window_tokens,
        };
        eprintln!("[ContextEngine] conversation_id={} context_version={} model={} limit={} input_tokens={} reserved_output_tokens={} recent_message_tokens={} summary_tokens={} retrieved_context_tokens={} compaction_performed={} snapshot_version={:?}", request.conversation_id, snapshot_version.unwrap_or(0), request.model, usage.model_context_limit, usage.input_tokens, usage.reserved_output_tokens, usage.recent_message_tokens, usage.summary_tokens, usage.retrieved_context_tokens, compaction_performed, snapshot_version);
        Ok(ContextAssembly {
            messages,
            context_version: snapshot_version.unwrap_or(0),
            snapshot_version,
            usage,
            compaction_performed,
        })
    }
}

#[derive(Debug, Clone)]
struct ContextStateRow {
    version: i64,
    summary: String,
    structured_state: StructuredConversationState,
    compacted_through_created_at: Option<i64>,
    compacted_through_message_id: Option<String>,
}

async fn load_state(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Option<ContextStateRow>, AppError> {
    let row = sqlx::query_as::<_, (i64, String, String, Option<i64>, Option<String>)>("SELECT version, summary, structured_state, compacted_through_created_at, compacted_through_message_id FROM conversation_context_state WHERE conversation_id = ?").bind(conversation_id).fetch_optional(pool).await?;
    Ok(row.map(
        |(
            version,
            summary,
            structured_state,
            compacted_through_created_at,
            compacted_through_message_id,
        )| ContextStateRow {
            version,
            summary,
            structured_state: serde_json::from_str(&structured_state).unwrap_or_default(),
            compacted_through_created_at,
            compacted_through_message_id,
        },
    ))
}

async fn recent_messages(
    pool: &SqlitePool,
    conversation_id: &str,
    limit: i64,
) -> Result<Vec<MessageRow>, AppError> {
    let mut rows = sqlx::query_as::<_, MessageRow>("SELECT id, conversation_id, role, content, status, provider, model, created_at, updated_at FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").bind(conversation_id).bind(limit).fetch_all(pool).await?;
    rows.reverse();
    Ok(rows)
}

async fn load_uncompacted_messages(
    pool: &SqlitePool,
    conversation_id: &str,
    before: Option<&MessageRow>,
    after: Option<i64>,
    after_id: Option<&str>,
) -> Result<Vec<MessageRow>, AppError> {
    let before_created_at = before.map(|message| message.created_at);
    let before_id = before.map(|message| message.id.as_str());
    Ok(sqlx::query_as::<_, MessageRow>("SELECT id, conversation_id, role, content, status, provider, model, created_at, updated_at FROM conversation_messages WHERE conversation_id = ? AND (? IS NULL OR created_at > ? OR (created_at = ? AND id > ?)) AND (? IS NULL OR created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at ASC, id ASC LIMIT 600")
        .bind(conversation_id)
        .bind(after)
        .bind(after.unwrap_or(i64::MIN))
        .bind(after.unwrap_or(i64::MIN))
        .bind(after_id)
        .bind(before_created_at)
        .bind(before_created_at.unwrap_or(i64::MAX))
        .bind(before_created_at.unwrap_or(i64::MAX))
        .bind(before_id)
        .fetch_all(pool)
        .await?)
}

fn select_recent(messages: &[MessageRow], budget: usize) -> Vec<MessageRow> {
    let mut selected = Vec::new();
    let mut used = 0;
    for message in messages.iter().rev() {
        let tokens = estimate_tokens(&message.content) + 4;
        if used + tokens > budget && !selected.is_empty() {
            break;
        }
        selected.push(message.clone());
        used += tokens;
    }
    selected.reverse();
    selected
}

fn to_llm_message(message: MessageRow) -> LlmMessage {
    LlmMessage {
        role: match message.role.as_str() {
            "assistant" => LlmRole::Assistant,
            "system" => LlmRole::System,
            "tool" => LlmRole::Tool,
            _ => LlmRole::User,
        },
        content: message.content,
    }
}

fn summary_message(summary: &str, state: &StructuredConversationState) -> Option<LlmMessage> {
    let has_structured_state = !state.objective.is_empty()
        || !state.current_phase.is_empty()
        || !state.goals.is_empty()
        || !state.decisions.is_empty()
        || !state.constraints.is_empty()
        || !state.completed.is_empty()
        || !state.pending.is_empty()
        || !state.open_questions.is_empty()
        || !state.important_facts.is_empty()
        || !state.referenced_artifacts.is_empty();
    if summary.trim().is_empty() && !has_structured_state {
        return None;
    }
    Some(LlmMessage {
        role: LlmRole::System,
        content: format!(
            "Conversation continuation state:\nSummary:\n{summary}\nStructured state:\n{}",
            serde_json::to_string(state).unwrap_or_default()
        ),
    })
}

struct CompactionRecord<'a> {
    conversation_id: &'a str,
    version: i64,
    summary: &'a str,
    state: &'a StructuredConversationState,
    start: Option<&'a MessageRow>,
    end: Option<&'a MessageRow>,
    token_count: usize,
}

async fn persist_compaction(
    pool: &SqlitePool,
    record: CompactionRecord<'_>,
) -> Result<bool, AppError> {
    let timestamp = now();
    let state_json = serde_json::to_string(record.state).unwrap_or_else(|_| "{}".into());
    let mut transaction = pool.begin().await?;
    let state_updated = if record.version == 1 {
        sqlx::query("INSERT INTO conversation_context_state (conversation_id, version, summary, structured_state, compacted_through_created_at, compacted_through_message_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(conversation_id) DO NOTHING")
            .bind(record.conversation_id)
            .bind(record.version)
            .bind(record.summary)
            .bind(&state_json)
            .bind(record.end.map(|message| message.created_at))
            .bind(record.end.map(|message| message.id.as_str()))
            .bind(timestamp)
            .execute(&mut *transaction)
            .await?
            .rows_affected()
    } else {
        sqlx::query("UPDATE conversation_context_state SET version = ?, summary = ?, structured_state = ?, compacted_through_created_at = ?, compacted_through_message_id = ?, updated_at = ? WHERE conversation_id = ? AND version = ?")
            .bind(record.version)
            .bind(record.summary)
            .bind(&state_json)
            .bind(record.end.map(|message| message.created_at))
            .bind(record.end.map(|message| message.id.as_str()))
            .bind(timestamp)
            .bind(record.conversation_id)
            .bind(record.version - 1)
            .execute(&mut *transaction)
            .await?
            .rows_affected()
    };
    if state_updated == 0 {
        transaction.rollback().await?;
        return Ok(false);
    }
    sqlx::query("INSERT INTO conversation_context_snapshots (id, conversation_id, version, summary, structured_state, message_start_id, message_end_id, token_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(uuid::Uuid::new_v4().to_string()).bind(record.conversation_id).bind(record.version).bind(record.summary).bind(&state_json).bind(record.start.map(|message| message.id.as_str())).bind(record.end.map(|message| message.id.as_str())).bind(record.token_count as i64).bind(timestamp).execute(&mut *transaction).await?;
    transaction.commit().await?;
    Ok(true)
}

fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::select_recent;
    use crate::modules::conversation::model::MessageRow;

    fn message(id: &str, content: &str) -> MessageRow {
        MessageRow {
            id: id.into(),
            conversation_id: "conversation".into(),
            role: "user".into(),
            content: content.into(),
            status: "completed".into(),
            provider: None,
            model: None,
            created_at: 1,
            updated_at: None,
        }
    }

    #[test]
    fn recent_selection_keeps_messages_atomic_and_current_message() {
        let messages = vec![
            message("old", "1234567890123456"),
            message("current", "now"),
        ];
        let selected = select_recent(&messages, 1);
        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0].id, "current");
    }
}
