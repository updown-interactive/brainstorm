use super::{
    error::LlmError,
    request::{LlmRequest, LlmRole, ToolCall},
    response::{FinishReason, LlmModel, LlmResponse, LlmUsage},
};
use async_trait::async_trait;
use futures_util::{stream, StreamExt};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct HttpProvider {
    pub id: String,
    pub base_url: String,
    pub model: String,
    pub api_key: Option<String>,
    pub client: Client,
}

impl HttpProvider {
    fn auth(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        match &self.api_key {
            Some(key) => request.bearer_auth(key),
            None => request,
        }
    }
    async fn openai_generate(&self, request: LlmRequest) -> Result<LlmResponse, LlmError> {
        let body = openai_body(&request, false);
        let response = self
            .auth(
                self.client
                    .post(format!(
                        "{}/chat/completions",
                        self.base_url.trim_end_matches('/')
                    ))
                    .json(&body),
            )
            .send()
            .await
            .map_err(LlmError::Request)?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!(
                "[llm] request failure provider={} endpoint=chat/completions status={} body={}",
                self.id,
                status,
                truncate_log(&body)
            );
            return Err(LlmError::Response);
        }
        let value: Value = response.json().await.map_err(LlmError::Request)?;
        let message = &value["choices"][0]["message"];
        let raw_content = message["content"].as_str().unwrap_or_default().to_string();
        let mut tool_calls = parse_openai_tool_calls(message);
        // Grok/local models may still emit their legacy textual function
        // protocol. Keep this compatibility parser provider-local and only
        // use it after native tool-call parsing has found nothing.
        let content = if tool_calls.is_empty() && supports_textual_tool_fallback(&self.id) {
            let (text, parsed_calls) = parse_textual_tool_calls(&raw_content);
            if parsed_calls.is_empty() && contains_textual_tool_marker(&raw_content) {
                eprintln!(
                    "[llm] rejected malformed textual tool call provider={} reason=invalid_json_arguments",
                    self.id
                );
                return Err(LlmError::Response);
            }
            tool_calls = parsed_calls;
            text
        } else {
            raw_content
        };
        tool_calls = deduplicate_tool_calls(tool_calls);
        Ok(LlmResponse {
            content,
            model: self.model.clone(),
            tool_calls: tool_calls.clone(),
            finish_reason: finish_reason(
                value["choices"][0]["finish_reason"].as_str(),
                !tool_calls.is_empty(),
            ),
            usage: parse_usage(&value["usage"]),
        })
    }

    async fn openai_stream(
        &self,
        request: LlmRequest,
    ) -> Result<super::provider::LlmStream, LlmError> {
        let body = openai_body(&request, true);
        let response = self
            .auth(
                self.client
                    .post(format!(
                        "{}/chat/completions",
                        self.base_url.trim_end_matches('/')
                    ))
                    .json(&body),
            )
            .send()
            .await
            .map_err(LlmError::Request)?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!(
                "[llm] stream failure provider={} endpoint=chat/completions status={} body={}",
                self.id,
                status,
                truncate_log(&body)
            );
            return Err(LlmError::Response);
        }

        let bytes = response.bytes_stream();
        let stream = stream::unfold(
            (bytes, String::new(), false),
            |(mut bytes, mut buffer, finished)| async move {
                if finished {
                    return None;
                }
                loop {
                    if let Some(separator) = buffer.find("\n\n") {
                        let event = buffer[..separator].to_owned();
                        buffer.drain(..separator + 2);
                        let data = event
                            .lines()
                            .filter_map(|line| line.strip_prefix("data:"))
                            .map(str::trim)
                            .collect::<Vec<_>>()
                            .join("\n");
                        if data == "[DONE]" {
                            return None;
                        }
                        let delta = serde_json::from_str::<Value>(&data).ok().and_then(|value| {
                            value["choices"][0]["delta"]["content"]
                                .as_str()
                                .map(str::to_owned)
                        });
                        if let Some(delta) = delta.filter(|value| !value.is_empty()) {
                            return Some((Ok(delta), (bytes, buffer, finished)));
                        }
                        continue;
                    }
                    match bytes.next().await {
                        Some(Ok(chunk)) => {
                            buffer.push_str(&String::from_utf8_lossy(&chunk).replace("\r\n", "\n"))
                        }
                        Some(Err(error)) => {
                            return Some((Err(LlmError::Request(error)), (bytes, buffer, true)))
                        }
                        None => {
                            return None;
                        }
                    }
                }
            },
        );
        Ok(Box::pin(stream))
    }
}

#[async_trait]
impl super::provider::LlmProvider for HttpProvider {
    async fn generate(&self, request: LlmRequest) -> Result<LlmResponse, LlmError> {
        if self.id == "google" {
            return GeminiProvider(Arc::new(self.clone()))
                .generate(request)
                .await;
        }
        self.openai_generate(request).await
    }
    async fn stream(&self, request: LlmRequest) -> Result<super::provider::LlmStream, LlmError> {
        if self.id == "google" {
            return self.generate(request).await.map(|response| {
                Box::pin(stream::once(async move { Ok(response.content) }))
                    as super::provider::LlmStream
            });
        }
        self.openai_stream(request).await
    }
    async fn validate(&self) -> Result<(), LlmError> {
        self.models().await.map(|_| ())
    }
    async fn models(&self) -> Result<Vec<LlmModel>, LlmError> {
        let response = self
            .auth(
                self.client
                    .get(format!("{}/models", self.base_url.trim_end_matches('/'))),
            )
            .send()
            .await
            .map_err(LlmError::Request)?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!(
                "[llm] models failure provider={} endpoint=models status={} body={}",
                self.id,
                status,
                truncate_log(&body)
            );
            return Err(LlmError::Response);
        }
        let value: Value = response.json().await.map_err(LlmError::Request)?;
        Ok(value["data"]
            .as_array()
            .map(|models| {
                models
                    .iter()
                    .filter_map(|model| {
                        model["id"].as_str().map(|id| LlmModel {
                            id: id.into(),
                            name: id.into(),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default())
    }
}

fn openai_body(request: &LlmRequest, stream: bool) -> Value {
    let messages = request.messages.iter().map(|message| {
        let role = match message.role { LlmRole::System => "system", LlmRole::User => "user", LlmRole::Assistant => "assistant", LlmRole::Tool => "tool" };
        let mut value = json!({ "role": role, "content": message.content });
        if let Some(id) = &message.tool_call_id { value["tool_call_id"] = json!(id); }
        if !message.tool_calls.is_empty() { value["tool_calls"] = json!(message.tool_calls.iter().map(|call| json!({"id": call.id, "type": "function", "function": {"name": provider_tool_name(&call.name), "arguments": call.arguments.to_string()}})).collect::<Vec<_>>()); }
        value
    }).collect::<Vec<_>>();
    let tools = request.tools.iter().map(|tool| json!({"type":"function","function":{"name":provider_tool_name(&tool.name),"description":tool.description,"parameters":tool.input_schema}})).collect::<Vec<_>>();
    json!({ "model": request.model, "messages": messages, "tools": tools, "temperature": request.temperature, "max_tokens": request.max_tokens, "stream": stream })
}

fn parse_openai_tool_calls(message: &Value) -> Vec<ToolCall> {
    message["tool_calls"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|call| {
            let function = &call["function"];
            let arguments = function["arguments"]
                .as_str()
                .and_then(|value| serde_json::from_str(value).ok())
                .unwrap_or_else(|| json!({}));
            Some(ToolCall {
                id: call["id"].as_str()?.into(),
                name: canonical_tool_name(function["name"].as_str()?),
                arguments,
            })
        })
        .collect()
}

/// Some OpenAI-compatible local models print their tool protocol instead of
/// returning the structured `tool_calls` field. Keep this compatibility path
/// at the provider boundary so chat and the tool runtime remain provider-agnostic.
fn parse_textual_tool_calls(content: &str) -> (String, Vec<ToolCall>) {
    let mut remaining = content.trim();
    let mut calls = Vec::new();
    loop {
        let (name, arguments_text) =
            if let Some((start, marker)) = find_textual_tool_marker(remaining) {
                let after_marker = &remaining[start + marker.len()..];
                if marker == "<function>" {
                    let Some(argument_start) = after_marker.find('{') else {
                        break;
                    };
                    (
                        canonical_tool_name(after_marker[..argument_start].trim()),
                        &after_marker[argument_start..],
                    )
                } else {
                    let Some(argument_start) = after_marker.find('>') else {
                        break;
                    };
                    (
                        canonical_tool_name(after_marker[..argument_start].trim()),
                        &after_marker[argument_start + 1..],
                    )
                }
            } else {
                let Some(argument_start) = remaining.find('{') else {
                    break;
                };
                let candidate = remaining[..argument_start].trim();
                if candidate.is_empty()
                    || candidate.chars().any(char::is_whitespace)
                    || !candidate.contains("__")
                {
                    break;
                }
                (canonical_tool_name(candidate), &remaining[argument_start..])
            };
        let Some(object_end) = json_object_end(arguments_text) else {
            break;
        };
        let json_text = &arguments_text[..object_end];
        let Ok(arguments) = serde_json::from_str::<Value>(json_text) else {
            break;
        };
        calls.push(ToolCall {
            id: format!("textual-call-{}", calls.len() + 1),
            name,
            arguments,
        });
        remaining = &arguments_text[object_end..];
        if remaining.starts_with(';') {
            remaining = &remaining[1..];
        }
    }
    let calls = deduplicate_tool_calls(calls);
    if calls.is_empty() {
        (content.into(), calls)
    } else {
        (remaining.trim().into(), calls)
    }
}

fn deduplicate_tool_calls(calls: Vec<ToolCall>) -> Vec<ToolCall> {
    let mut unique = Vec::with_capacity(calls.len());
    let mut seen = std::collections::HashSet::new();
    for call in calls {
        let key = format!("{}:{}", call.name, call.arguments);
        if seen.insert(key) {
            unique.push(call);
        }
    }
    unique
}

fn json_object_end(content: &str) -> Option<usize> {
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for (index, character) in content.char_indices() {
        if in_string {
            if escaped {
                escaped = false;
            } else if character == '\\' {
                escaped = true;
            } else if character == '"' {
                in_string = false;
            }
            continue;
        }
        match character {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth = depth.checked_sub(1)?;
                if depth == 0 {
                    return Some(index + 1);
                }
            }
            _ => {}
        }
    }
    None
}

fn provider_tool_name(name: &str) -> String {
    name.replace('.', "__")
}

fn supports_textual_tool_fallback(provider_id: &str) -> bool {
    matches!(provider_id, "grok" | "ollama" | "openai-compatible")
}

fn canonical_tool_name(name: &str) -> String {
    name.replace("__", ".")
}

fn find_textual_tool_marker(content: &str) -> Option<(usize, &'static str)> {
    ["=function=", "< function=", "<function?", "<function>"]
        .into_iter()
        .filter_map(|marker| content.find(marker).map(|index| (index, marker)))
        .min_by_key(|(index, _)| *index)
}

fn contains_textual_tool_marker(content: &str) -> bool {
    find_textual_tool_marker(content).is_some()
}

fn parse_usage(value: &Value) -> Option<LlmUsage> {
    Some(LlmUsage {
        input_tokens: value["prompt_tokens"].as_u64()? as u32,
        output_tokens: value["completion_tokens"].as_u64()? as u32,
    })
}

fn finish_reason(value: Option<&str>, has_tools: bool) -> FinishReason {
    if has_tools || value == Some("tool_calls") {
        FinishReason::ToolCalls
    } else if value == Some("length") {
        FinishReason::Length
    } else if value == Some("stop") {
        FinishReason::Stop
    } else {
        FinishReason::Unknown
    }
}

impl Clone for HttpProvider {
    fn clone(&self) -> Self {
        Self {
            id: self.id.clone(),
            base_url: self.base_url.clone(),
            model: self.model.clone(),
            api_key: self.api_key.clone(),
            client: self.client.clone(),
        }
    }
}

pub struct GeminiProvider(pub Arc<HttpProvider>);
#[async_trait]
impl super::provider::LlmProvider for GeminiProvider {
    async fn generate(&self, request: LlmRequest) -> Result<LlmResponse, LlmError> {
        let key = self
            .0
            .api_key
            .as_ref()
            .ok_or(LlmError::ProviderNotConfigured)?;
        let contents = request.messages.iter().map(|m| {
            let mut parts = Vec::new();
            if !m.content.is_empty() { parts.push(json!({"text": m.content})); }
            parts.extend(m.tool_calls.iter().map(|call| json!({"functionCall":{"name":provider_tool_name(&call.name),"args":call.arguments}})));
            if let Some(id) = &m.tool_call_id { parts.push(json!({"functionResponse":{"name":id,"response":{"result":m.content}}})); }
            json!({"role": if matches!(m.role, LlmRole::User | LlmRole::Tool) { "user" } else { "model" }, "parts": parts})
        }).collect::<Vec<_>>();
        let declarations = request.tools.iter().map(|tool| json!({"name":provider_tool_name(&tool.name),"description":tool.description,"parameters":tool.input_schema})).collect::<Vec<_>>();
        let body =
            json!({ "contents": contents, "tools": [{"functionDeclarations": declarations}] });
        let url = format!(
            "{}/v1beta/models/{}:generateContent?key={}",
            self.0.base_url.trim_end_matches('/'),
            request.model,
            key
        );
        let response = self
            .0
            .client
            .post(url)
            .json(&body)
            .send()
            .await
            .map_err(LlmError::Request)?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            eprintln!(
                "[llm] request failure provider=google endpoint=generateContent status={} body={}",
                status,
                truncate_log(&body)
            );
            return Err(LlmError::Response);
        }
        let value: Value = response.json().await.map_err(LlmError::Request)?;
        let parts = value["candidates"][0]["content"]["parts"]
            .as_array()
            .ok_or(LlmError::Response)?;
        let content = parts
            .iter()
            .filter_map(|part| part["text"].as_str())
            .collect::<String>();
        let tool_calls = parts
            .iter()
            .filter_map(|part| {
                let call = &part["functionCall"];
                let provider_name = call["name"].as_str()?.to_owned();
                Some(ToolCall {
                    id: provider_name.clone(),
                    name: canonical_tool_name(&provider_name),
                    arguments: call["args"].clone(),
                })
            })
            .collect::<Vec<_>>();
        Ok(LlmResponse {
            content,
            model: request.model,
            finish_reason: if tool_calls.is_empty() {
                FinishReason::Stop
            } else {
                FinishReason::ToolCalls
            },
            tool_calls,
            usage: None,
        })
    }
    async fn validate(&self) -> Result<(), LlmError> {
        self.generate(LlmRequest {
            model: self.0.model.clone(),
            messages: vec![super::request::LlmMessage {
                role: LlmRole::User,
                content: "ping".into(),
                tool_call_id: None,
                tool_calls: vec![],
            }],
            tools: vec![],
            temperature: None,
            max_tokens: Some(1),
        })
        .await
        .map(|_| ())
    }
    async fn models(&self) -> Result<Vec<LlmModel>, LlmError> {
        Ok(vec![LlmModel {
            id: self.0.model.clone(),
            name: self.0.model.clone(),
        }])
    }
}

fn truncate_log(value: &str) -> String {
    value
        .replace(['\n', '\r'], " ")
        .chars()
        .take(1000)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{canonical_tool_name, parse_textual_tool_calls, provider_tool_name};

    #[test]
    fn provider_tool_names_round_trip() {
        assert_eq!(
            canonical_tool_name(&provider_tool_name("vault.create_file")),
            "vault.create_file"
        );
    }

    #[test]
    fn textual_fallback_normalizes_function_calls() {
        let (_, calls) = parse_textual_tool_calls(
            r##"<function>vault__create_file {"path":"test.md","content":"# Test"}</function>"##,
        );
        assert_eq!(calls[0].name, "vault.create_file");
        assert_eq!(calls[0].arguments["path"], "test.md");
    }
}
