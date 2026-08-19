use crate::modules::ai::request::LlmMessage;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContextItemType {
    Summary,
    Message,
    Objective,
    Goal,
    Decision,
    Constraint,
    Preference,
    Fact,
    OpenQuestion,
    ToolResult,
    Artifact,
    Reference,
    Plan,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextItem {
    pub id: String,
    pub item_type: ContextItemType,
    pub content: String,
    pub importance: u8,
    pub source_message_id: Option<String>,
    pub persistent: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StructuredConversationState {
    pub objective: String,
    pub current_phase: String,
    pub goals: Vec<String>,
    pub decisions: Vec<String>,
    pub constraints: Vec<String>,
    pub completed: Vec<String>,
    pub pending: Vec<String>,
    pub open_questions: Vec<String>,
    pub important_facts: Vec<String>,
    pub referenced_artifacts: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct TokenUsage {
    pub system_tokens: usize,
    pub summary_tokens: usize,
    pub recent_message_tokens: usize,
    pub retrieved_context_tokens: usize,
    pub tool_tokens: usize,
    pub input_tokens: usize,
    pub reserved_output_tokens: usize,
    pub model_context_limit: usize,
}

#[derive(Debug, Clone)]
pub struct ContextAssembly {
    pub messages: Vec<LlmMessage>,
    pub knowledge_context: Option<super::knowledge::KnowledgeContext>,
    pub context_version: i64,
    pub snapshot_version: Option<i64>,
    pub usage: TokenUsage,
    pub compaction_performed: bool,
}
