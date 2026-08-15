use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct MarkdownDocument {
    pub path: String,
    pub content: String,
    pub frontmatter: Value,
    pub body: String,
    pub headings: Vec<Heading>,
    pub wiki_links: Vec<WikiLink>,
    pub markdown_links: Vec<MarkdownLink>,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Heading {
    pub level: u8,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct WikiLink {
    pub target: String,
    pub display: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MarkdownLink {
    pub text: String,
    pub target: String,
    pub internal: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Tag {
    pub value: String,
    pub source: TagSource,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TagSource {
    Frontmatter,
    Content,
}
