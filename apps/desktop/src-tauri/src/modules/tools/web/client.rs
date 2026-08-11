use std::{
    net::{IpAddr, SocketAddr},
    time::Duration,
};

use reqwest::{header::CONTENT_TYPE, redirect::Policy, Client};
use tokio::net::lookup_host;
use url::Url;

use super::{
    config::WebManifest,
    error::WebError,
    extract::{extract_html, extract_plain_text},
    types::WebFetchResult,
};

pub struct WebClient {
    client: Client,
}

impl WebClient {
    pub fn new() -> Result<Self, WebError> {
        let client = Client::builder()
            .redirect(Policy::none())
            .build()
            .map_err(|_| WebError::Network)?;
        Ok(Self { client })
    }

    pub async fn fetch(
        &self,
        raw_url: &str,
        config: &WebManifest,
    ) -> Result<WebFetchResult, WebError> {
        let mut url = validate_url(raw_url).await?;
        let timeout = Duration::from_secs(config.limits.timeout_seconds);
        for _ in 0..=config.limits.max_redirects {
            let addresses = validate_host(&url).await?;
            let _address = addresses.first().copied().ok_or(WebError::BlockedAddress)?;
            let response = self
                .client
                .get(url.clone())
                .header(reqwest::header::USER_AGENT, &config.client.user_agent)
                .timeout(timeout)
                .send()
                .await
                .map_err(map_request_error)?;
            if response.status().is_redirection() {
                let location = response
                    .headers()
                    .get(reqwest::header::LOCATION)
                    .ok_or(WebError::Network)?;
                let next = response
                    .url()
                    .join(location.to_str().map_err(|_| WebError::InvalidUrl)?)
                    .map_err(|_| WebError::InvalidUrl)?;
                if !config.client.follow_redirects {
                    return Err(WebError::Network);
                }
                url = validate_url(next.as_str()).await?;
                continue;
            }
            let status = response.status();
            if !status.is_success() {
                return Err(WebError::HttpStatus(status.as_u16()));
            }
            let content_type = response
                .headers()
                .get(CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("application/octet-stream")
                .split(';')
                .next()
                .unwrap_or("")
                .trim()
                .to_ascii_lowercase();
            if !matches!(
                content_type.as_str(),
                "text/html" | "application/xhtml+xml" | "text/plain"
            ) {
                return Err(WebError::UnsupportedContentType(content_type));
            }
            let body = read_limited(response, config.limits.max_response_size, timeout).await?;
            let extracted = if content_type == "text/plain" {
                extract_plain_text(&body, config.limits.max_extracted_text_size)
            } else {
                extract_html(
                    &body,
                    config.limits.max_extracted_text_size,
                    &config.extraction.content_selector,
                )?
            };
            return Ok(WebFetchResult {
                success: true,
                url: url.to_string(),
                status: status.as_u16(),
                content_type,
                title: extracted.title,
                content: extracted.content,
            });
        }
        Err(WebError::Network)
    }
}

async fn read_limited(
    mut response: reqwest::Response,
    max_bytes: usize,
    timeout: Duration,
) -> Result<String, WebError> {
    let mut bytes = Vec::new();
    while let Some(chunk) = tokio::time::timeout(timeout, response.chunk())
        .await
        .map_err(|_| WebError::RequestTimeout)?
        .map_err(|_| WebError::Network)?
    {
        if bytes.len().saturating_add(chunk.len()) > max_bytes {
            return Err(WebError::ResponseTooLarge);
        }
        bytes.extend_from_slice(&chunk);
    }
    String::from_utf8(bytes).map_err(|_| WebError::UnsupportedContentType("non-UTF-8 text".into()))
}

async fn validate_url(raw_url: &str) -> Result<Url, WebError> {
    let url = Url::parse(raw_url).map_err(|_| WebError::InvalidUrl)?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(WebError::UnsupportedScheme(url.scheme().into()));
    }
    if url.host_str().is_none() {
        return Err(WebError::InvalidUrl);
    }
    validate_host(&url).await?;
    Ok(url)
}

async fn validate_host(url: &Url) -> Result<Vec<SocketAddr>, WebError> {
    let host = url.host_str().ok_or(WebError::InvalidUrl)?;
    if host.eq_ignore_ascii_case("localhost")
        || host.ends_with(".localhost")
        || host.eq_ignore_ascii_case("0.0.0.0")
    {
        return Err(WebError::BlockedHost);
    }
    let port = url.port_or_known_default().ok_or(WebError::InvalidUrl)?;
    let addresses = match url.host() {
        Some(url::Host::Ipv4(ip)) => vec![SocketAddr::new(IpAddr::V4(ip), port)],
        Some(url::Host::Ipv6(ip)) => vec![SocketAddr::new(IpAddr::V6(ip), port)],
        _ => lookup_host((host, port))
            .await
            .map_err(|_| WebError::Network)?
            .collect(),
    };
    if addresses.is_empty() {
        return Err(WebError::Network);
    }
    if addresses.iter().any(|address| is_blocked_ip(address.ip())) {
        return Err(WebError::BlockedAddress);
    }
    Ok(addresses)
}

fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => {
            ip.is_loopback()
                || ip.is_private()
                || ip.is_link_local()
                || ip.is_unspecified()
                || ip.octets()[0] == 100 && (64..=127).contains(&ip.octets()[1])
                || ip.octets()[0] == 169 && ip.octets()[1] == 254
        }
        IpAddr::V6(ip) => {
            ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.segments()[0] == 0xfe80
        }
    }
}

fn map_request_error(error: reqwest::Error) -> WebError {
    if error.is_timeout() {
        WebError::RequestTimeout
    } else {
        WebError::Network
    }
}

#[cfg(test)]
mod tests {
    use super::{is_blocked_ip, validate_url};
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn rejects_unsupported_schemes() {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            assert!(validate_url("file:///etc/passwd").await.is_err());
            assert!(validate_url("javascript:alert(1)").await.is_err());
        });
    }

    #[test]
    fn rejects_local_and_private_addresses() {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            for url in [
                "http://localhost",
                "http://127.0.0.1",
                "http://10.0.0.1",
                "http://192.168.1.1",
            ] {
                assert!(validate_url(url).await.is_err(), "{url} should be blocked");
            }
        });
    }

    #[test]
    fn blocks_loopback_private_and_link_local_ips() {
        for ip in [
            Ipv4Addr::LOCALHOST,
            Ipv4Addr::new(10, 0, 0, 1),
            Ipv4Addr::new(169, 254, 1, 1),
        ] {
            assert!(is_blocked_ip(IpAddr::V4(ip)));
        }
    }
}
