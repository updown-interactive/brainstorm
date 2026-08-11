use scraper::{Html, Selector};

use super::error::WebError;

pub struct ExtractedPage {
    pub title: Option<String>,
    pub content: String,
}

pub fn extract_html(
    body: &str,
    max_text_bytes: usize,
    content_selector: &str,
) -> Result<ExtractedPage, WebError> {
    let document = Html::parse_document(body);
    let title_selector = Selector::parse("title").map_err(|_| WebError::Extraction)?;
    let title = document
        .select(&title_selector)
        .next()
        .map(|node| normalize(node.text().collect::<String>()).into());
    let content_selector = Selector::parse(content_selector).map_err(|_| WebError::Extraction)?;
    let content = document
        .select(&content_selector)
        .map(|node| node.text().collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>()
        .join(" ");
    let content = truncate_utf8(&normalize(content), max_text_bytes);
    Ok(ExtractedPage { title, content })
}

pub fn extract_plain_text(body: &str, max_text_bytes: usize) -> ExtractedPage {
    ExtractedPage {
        title: None,
        content: truncate_utf8(&normalize(body.to_owned()), max_text_bytes),
    }
}

fn normalize(value: String) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_utf8(value: &str, max_bytes: usize) -> String {
    if value.len() <= max_bytes {
        return value.to_owned();
    }
    value
        .char_indices()
        .take_while(|(index, _)| *index < max_bytes)
        .map(|(_, ch)| ch)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::extract_html;

    #[test]
    fn removes_non_readable_html_elements_and_extracts_title() {
        let page = extract_html("<html><head><title> Example </title><style>x</style></head><body><script>x</script><p>Hello   world</p></body></html>", 100, "body :not(script):not(style):not(noscript):not(nav)").unwrap();
        assert_eq!(page.title.as_deref(), Some("Example"));
        assert_eq!(page.content, "Hello world");
    }
}
