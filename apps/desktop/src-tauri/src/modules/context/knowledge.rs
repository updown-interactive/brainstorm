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
    pub heading: String,
    pub heading_path: String,
    pub chunk_index: usize,
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
                    "Source: {}\nTitle: {}\nHeading: {}\nHeading path: {}\nRelevance: {:.2}\nRelevant content:\n{}",
                    result.file_path,
                    result.title,
                    result.heading,
                    result.heading_path,
                    result.relevance_score,
                    result.chunk
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");
        format!("You have access to the user's private knowledge base.\nThese retrieved notes are the primary source for this response. Answer from them whenever they contain relevant information, preserve their meaning, and cite sources by path when possible. Do not invent facts attributed to the knowledge base. If the notes do not answer the request, say that clearly before adding any general model knowledge, and distinguish that general knowledge from the retrieved notes.\n\nRetrieved knowledge:\n{sources}")
    }
}

pub async fn retrieve(project_path: &str, query: &str) -> Option<KnowledgeContext> {
    // Every user prompt goes through the KB. An empty prompt cannot produce a
    // useful search, while a non-matching query naturally falls back to the LLM.
    if project_path.trim().is_empty() || !has_search_query(query) {
        eprintln!(
            "[KB] retrieval_skipped reason={} query_len={} project_path_configured={}",
            if project_path.trim().is_empty() {
                "missing_project_path"
            } else {
                "empty_query"
            },
            query.trim().chars().count(),
            !project_path.trim().is_empty()
        );
        return None;
    }
    let root = project_path.to_string();
    let query = query.trim().to_string();
    eprintln!(
        "[KB] retrieval_started query={:?} query_len={} max_results={}",
        query.chars().take(160).collect::<String>(),
        query.chars().count(),
        MAX_RESULTS
    );
    let search_query = query.clone();
    let search_result = tokio::task::spawn_blocking(move || {
        let mut index = SearchIndex::open(&root).map_err(|error| error.to_string())?;
        index
            .query(SearchQuery {
                query: search_query,
                limit: Some(MAX_RESULTS),
                path: None,
                tags: None,
            })
            .map_err(|error| error.to_string())
    })
    .await;
    let result = match search_result {
        Ok(Ok(value)) => value,
        Ok(Err(error)) => {
            eprintln!("[KB] retrieval_failed stage=index_query error={error}");
            return None;
        }
        Err(error) => {
            eprintln!("[KB] retrieval_failed stage=worker_join error={error}");
            return None;
        }
    };
    let context = build_context(query, result);
    match &context {
        Some(value) => {
            let ranked_results = value
                .results
                .iter()
                .map(|result| format!("{}:{:.1}", result.file_path, result.relevance_score))
                .collect::<Vec<_>>();
            eprintln!(
                "[KB] retrieval_completed outcome=matched result_count={} confidence={:.2} ranked_results={:?}",
                value.results.len(),
                value.confidence,
                ranked_results
            );
        }
        None => eprintln!("[KB] retrieval_completed outcome=no_match fallback=llm"),
    }
    context
}

fn has_search_query(query: &str) -> bool {
    !query.trim().is_empty()
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
                heading: item
                    .get("heading")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                heading_path: item
                    .get("headingPath")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                chunk_index: item
                    .get("chunkIndex")
                    .and_then(Value::as_u64)
                    .unwrap_or_default() as usize,
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
    #[test]
    fn empty_queries_are_not_sent_to_the_knowledge_index() {
        assert!(!super::has_search_query("   "));
    }

    #[test]
    fn generic_queries_are_eligible_for_knowledge_retrieval() {
        assert!(super::has_search_query("Explain the architecture"));
    }
}
