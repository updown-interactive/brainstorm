use super::{
    error::LlmError,
    request::{LlmRequest, LlmRole},
    response::{LlmModel, LlmResponse},
};
use async_trait::async_trait;
use futures_util::{stream, StreamExt};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::Arc;

fn format_provider_detail(status: reqwest::StatusCode, body: &str) -> String {
    let detail = body.trim().replace(['\n', '\r'], " ");
    let detail = if detail.chars().count() > 300 {
        format!("{}…", detail.chars().take(300).collect::<String>())
    } else {
        detail
    };
    if detail.is_empty() {
        status.to_string()
    } else {
        format!("HTTP {status}: {detail}")
    }
}

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
        let body = json!({ "model": request.model, "messages": request.messages.iter().map(|m| json!({"role": match m.role { LlmRole::System => "system", LlmRole::User => "user", LlmRole::Assistant => "assistant", LlmRole::Tool => "tool" }, "content": m.content})).collect::<Vec<_>>(), "temperature": request.temperature, "max_tokens": request.max_tokens });
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
            let detail = response.text().await.unwrap_or_default();
            return Err(LlmError::Response(format_provider_detail(status, &detail)));
        }
        let value: Value = response.json().await.map_err(LlmError::Request)?;
        let content = value["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| LlmError::Response("missing choices[0].message.content".into()))?
            .to_string();
        Ok(LlmResponse {
            content,
            model: self.model.clone(),
            usage: None,
        })
    }

    async fn openai_stream(
        &self,
        request: LlmRequest,
    ) -> Result<super::provider::LlmStream, LlmError> {
        let body = json!({ "model": request.model, "messages": request.messages.iter().map(|m| json!({"role": match m.role { LlmRole::System => "system", LlmRole::User => "user", LlmRole::Assistant => "assistant", LlmRole::Tool => "tool" }, "content": m.content})).collect::<Vec<_>>(), "temperature": request.temperature, "max_tokens": request.max_tokens, "stream": true });
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
            let detail = response.text().await.unwrap_or_default();
            return Err(LlmError::Response(format_provider_detail(status, &detail)));
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
            let detail = response.text().await.unwrap_or_default();
            return Err(LlmError::Response(format_provider_detail(status, &detail)));
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
        let body = json!({ "contents": request.messages.iter().map(|m| json!({"role": if matches!(m.role, LlmRole::User) { "user" } else { "model" }, "parts": [{"text": m.content}]})).collect::<Vec<_>>() });
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
            let detail = response.text().await.unwrap_or_default();
            return Err(LlmError::Response(format_provider_detail(status, &detail)));
        }
        let value: Value = response.json().await.map_err(LlmError::Request)?;
        let content = value["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| {
                LlmError::Response("missing candidates[0].content.parts[0].text".into())
            })?
            .to_string();
        Ok(LlmResponse {
            content,
            model: request.model,
            usage: None,
        })
    }
    async fn validate(&self) -> Result<(), LlmError> {
        self.generate(LlmRequest {
            model: self.0.model.clone(),
            messages: vec![super::request::LlmMessage {
                role: LlmRole::User,
                content: "ping".into(),
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
