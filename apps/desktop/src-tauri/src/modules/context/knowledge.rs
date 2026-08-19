use crate::modules::tools::search::index::{SearchIndex, SearchQuery};
use serde::Serialize;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_RESULTS: usize = 8;
const MAX_CONTEXT_CHARS: usize = 12_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeResult {
    pub file_path: String,
    pub title: String,
    pub chunk: String,
    pub relevance_score: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeContext {
    pub query: String,
    pub results: Vec<KnowledgeResult>,
    pub sources: Vec<String>,
    pub confidence: f32,
    pub retrieved_at: i64,
}

impl KnowledgeContext {
    pub fn prompt(&self) -> String {
        let sources = self
            .results
            .iter()
            .map(|result| {
                format!(
                    "Source: {}\nTitle: {}\nRelevance: {:.2}\nRelevant content:\n{}",
                    result.file_path, result.title, result.relevance_score, result.chunk
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");
        format!("You have access to the user's private knowledge base.\nUse it when relevant and do not invent facts attributed to it. If it does not contain enough information, say so clearly. Distinguish retrieved knowledge from general model knowledge and cite sources by path when possible.\n\nRetrieved knowledge:\n{sources}")
    }
}

pub fn should_retrieve(query: &str) -> bool {
    let normalized = query.to_ascii_lowercase();
    let first_person = [
        "my ",
        "i wrote",
        "we decided",
        "our ",
        "in my",
        "based on my",
    ]
    .iter()
    .any(|cue| normalized.contains(cue));
    let knowledge_intent = [
        "knowledge",
        "notes",
        "vault",
        "brainstorm",
        "decision",
        "roadmap",
        "what did",
        "summarize",
        "according to",
        "based on",
        "wrote about",
        "we decided",
        "my files",
        "my docs",
    ]
    .iter()
    .any(|cue| normalized.contains(cue));
    first_person || knowledge_intent
}

pub async fn retrieve(project_path: &str, query: &str) -> Option<KnowledgeContext> {
    if project_path.trim().is_empty() || !should_retrieve(query) {
        return None;
    }
    let root = project_path.to_string();
    let query = query.trim().to_string();
    let result = tokio::task::spawn_blocking(move || {
        let mut index = SearchIndex::open(&root).map_err(|error| error.to_string())?;
        index
            .query(SearchQuery {
                query: query.clone(),
                limit: Some(MAX_RESULTS),
                path: None,
                tags: None,
            })
            .map_err(|error| error.to_string())
    })
    .await
    .ok()?
    .ok()?;
    build_context(query, result)
}

fn build_context(query: String, value: Value) -> Option<KnowledgeContext> {
    let mut used_chars = 0;
    let results = value
        .get("results")?
        .as_array()?
        .iter()
        .filter_map(|item| {
            let file_path = item.get("path")?.as_str()?.to_string();
            let chunk = item.get("snippet")?.as_str()?.trim().to_string();
            if chunk.is_empty() || used_chars >= MAX_CONTEXT_CHARS {
                return None;
            }
            let remaining = MAX_CONTEXT_CHARS - used_chars;
            let chunk = chunk.chars().take(remaining).collect::<String>();
            used_chars += chunk.len();
            Some(KnowledgeResult {
                file_path,
                title: item
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                relevance_score: item
                    .get("score")
                    .and_then(Value::as_f64)
                    .unwrap_or_default() as f32,
                chunk,
            })
        })
        .collect::<Vec<_>>();
    if results.is_empty() {
        return None;
    }
    let sources = results
        .iter()
        .map(|item| item.file_path.clone())
        .collect::<Vec<_>>();
    let max_score = results
        .iter()
        .map(|item| item.relevance_score)
        .fold(0.0, f32::max);
    Some(KnowledgeContext {
        query,
        results,
        sources,
        confidence: (max_score / 100.0).clamp(0.0, 1.0),
        retrieved_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_secs() as i64)
            .unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::should_retrieve;

    #[test]
    fn detects_private_knowledge_intent_without_retrieving_generic_requests() {
        assert!(should_retrieve("What did I write about MAASH?"));
        assert!(should_retrieve(
            "Based on my knowledge, what should I do next?"
        ));
        assert!(!should_retrieve("Write a poem about architecture."));
        assert!(!should_retrieve("What is 2 + 2?"));
    }
}
