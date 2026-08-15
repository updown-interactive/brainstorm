use super::{
    frontmatter::{frontmatter_tags, split_frontmatter},
    headings::extract_headings,
    links::{extract_markdown_links, extract_wiki_links},
    types::{MarkdownDocument, Tag, TagSource},
};

pub fn parse_document(
    path: &str,
    content: &str,
) -> Result<MarkdownDocument, super::error::MarkdownError> {
    let (frontmatter, body) = split_frontmatter(content)?;
    let mut tags = frontmatter_tags(&frontmatter)
        .into_iter()
        .map(|value| Tag {
            value,
            source: TagSource::Frontmatter,
        })
        .collect::<Vec<_>>();
    tags.extend(extract_body_tags(body).into_iter().map(|value| Tag {
        value,
        source: TagSource::Content,
    }));
    Ok(MarkdownDocument {
        path: path.to_string(),
        content: content.to_string(),
        frontmatter,
        body: body.to_string(),
        headings: extract_headings(body),
        wiki_links: extract_wiki_links(body),
        markdown_links: extract_markdown_links(body),
        tags,
    })
}

fn extract_body_tags(body: &str) -> Vec<String> {
    body.split_whitespace()
        .filter_map(|word| {
            let candidate = word.trim_matches(|character: char| {
                !character.is_ascii_alphanumeric()
                    && character != '#'
                    && character != '_'
                    && character != '/'
                    && character != '-'
            });
            if candidate.starts_with('#')
                && candidate.len() > 1
                && candidate[1..].chars().all(|character| {
                    character.is_ascii_alphanumeric()
                        || character == '_'
                        || character == '/'
                        || character == '-'
                })
            {
                Some(candidate.to_string())
            } else {
                None
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::parse_document;

    #[test]
    fn parses_a_complete_document() {
        let document = parse_document("Homes.md", "---\nname: Homes\n---\n# Homes\nSee [[Test|Display]] and [Example](https://example.com). #rust #project/brainstorm\n").unwrap();
        assert_eq!(document.body, "# Homes\nSee [[Test|Display]] and [Example](https://example.com). #rust #project/brainstorm\n");
        assert_eq!(document.headings[0].text, "Homes");
        assert_eq!(document.wiki_links[0].display.as_deref(), Some("Display"));
        assert_eq!(document.markdown_links[0].target, "https://example.com");
        assert_eq!(document.tags.len(), 2);
    }
}
