use super::types::{MarkdownLink, WikiLink};

pub fn extract_wiki_links(body: &str) -> Vec<WikiLink> {
    let mut links = Vec::new();
    let mut cursor = 0;
    while let Some(start) = body[cursor..].find("[[") {
        let start = cursor + start + 2;
        let Some(end) = body[start..].find("]]") else {
            break;
        };
        let raw = &body[start..start + end];
        let mut parts = raw.splitn(2, '|');
        let target = parts.next().unwrap_or_default().trim();
        if !target.is_empty() {
            links.push(WikiLink {
                target: target.to_string(),
                display: parts.next().map(|value| value.trim().to_string()),
            });
        }
        cursor = start + end + 2;
    }
    links
}

pub fn extract_markdown_links(body: &str) -> Vec<MarkdownLink> {
    let mut links = Vec::new();
    let mut cursor = 0;
    while let Some(open) = body[cursor..].find('[') {
        let open = cursor + open;
        if open > 0 && body.as_bytes()[open - 1] == b'!' {
            cursor = open + 1;
            continue;
        }
        let Some(close_text) = body[open + 1..].find(']') else {
            break;
        };
        let target_start = open + close_text + 2;
        if body.as_bytes().get(target_start) != Some(&b'(') {
            cursor = target_start;
            continue;
        }
        let Some(close_target) = body[target_start + 1..].find(')') else {
            break;
        };
        let text = &body[open + 1..open + close_text];
        let target = &body[target_start + 1..target_start + 1 + close_target];
        if !target.is_empty() {
            links.push(MarkdownLink {
                text: text.to_string(),
                internal: !target.contains("://") && !target.starts_with('#'),
                target: target.to_string(),
            });
        }
        cursor = target_start + close_target + 2;
    }
    links
}
