use super::{tokenizer::estimate_tokens, types::ContextItem};
use crate::core::error::AppError;
use crate::modules::conversation::model::MessageRow;
use sqlx::SqlitePool;

pub async fn retrieve(
    pool: &SqlitePool,
    conversation_id: &str,
    query: &str,
    before_created_at: Option<i64>,
    budget: usize,
) -> Result<Vec<ContextItem>, AppError> {
    let cutoff = before_created_at.unwrap_or(i64::MAX);
    let rows = sqlx::query_as::<_, MessageRow>(
        "SELECT id, conversation_id, role, content, status, provider, model, created_at, updated_at
         FROM conversation_messages
         WHERE conversation_id = ? AND created_at < ?
         ORDER BY created_at DESC LIMIT 300",
    )
    .bind(conversation_id)
    .bind(cutoff)
    .fetch_all(pool)
    .await?;
    let terms = query
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|term| term.len() >= 4)
        .map(str::to_ascii_lowercase)
        .take(8)
        .collect::<Vec<_>>();
    if terms.is_empty() {
        return Ok(Vec::new());
    }
    let mut candidates = rows
        .into_iter()
        .filter_map(|row| {
            let lower = row.content.to_ascii_lowercase();
            let matches = terms
                .iter()
                .filter(|term| lower.contains(term.as_str()))
                .count();
            (matches > 0).then_some((matches * 20 + (row.created_at.rem_euclid(20) as usize), row))
        })
        .collect::<Vec<_>>();
    candidates.sort_by_key(|candidate| std::cmp::Reverse(candidate.0));
    let mut used = 0;
    let mut items = Vec::new();
    for (_, row) in candidates {
        let tokens = estimate_tokens(&row.content);
        if used + tokens > budget && !items.is_empty() {
            continue;
        }
        used += tokens;
        items.push(ContextItem {
            id: format!("retrieved:{}", row.id),
            item_type: super::types::ContextItemType::Message,
            content: format!("Earlier {} message:\n{}", row.role, row.content),
            importance: 60,
            source_message_id: Some(row.id),
            persistent: false,
            created_at: row.created_at,
        });
        if used >= budget {
            break;
        }
    }
    items.sort_by_key(|item| item.created_at);
    Ok(items)
}
