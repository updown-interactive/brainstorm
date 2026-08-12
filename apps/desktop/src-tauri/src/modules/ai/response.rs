use serde::Serialize;

use super::request::ToolCall;

#[derive(Debug, Clone, Serialize)]
pub struct LlmResponse {
    pub content: String,
    pub model: String,
    pub tool_calls: Vec<ToolCall>,
    pub finish_reason: FinishReason,
    pub usage: Option<LlmUsage>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    Stop,
    ToolCalls,
    Length,
    Unknown,
}
#[derive(Debug, Clone, Serialize)]
pub struct LlmUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}
#[derive(Debug, Clone, Serialize)]
pub struct LlmModel {
    pub id: String,
    pub name: String,
}
#[derive(Debug, Clone, Serialize)]
pub struct SafeProviderError {
    pub code: String,
    pub message: String,
}
#[derive(Debug, Clone, Serialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub provider: String,
    pub model: String,
    pub latency_ms: Option<u64>,
    pub error: Option<SafeProviderError>,
}
