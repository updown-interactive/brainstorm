use std::{
    cmp::Ordering,
    fs,
    path::{Path, PathBuf},
};

use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::modules::{tools::markdown::parse_document, vault::VaultService};

const INDEX_VERSION: u32 = 2;
const DEFAULT_LIMIT: usize = 10;
const MAX_LIMIT: usize = 50;
const MAX_QUERY_LENGTH: usize = 512;
const MAX_SNIPPET_LENGTH: usize = 280;

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("search query cannot be empty")]
    EmptyQuery,
    #[error("search query is too long")]
    QueryTooLong,
    #[error("invalid search path: {0}")]
    InvalidPath(String),
    #[error("search index is not configured for this project")]
    NotConfigured,
    #[error("search index I/O failed")]
    Io,
    #[error("search index could not be rebuilt")]
    Rebuild,
    #[error("search index serialization failed")]
    Serialization,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedIndex {
    version: u32,
    chunks: Vec<KnowledgeChunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct KnowledgeChunk {
    id: String,
    file_id: String,
    path: String,
    filename: String,
    title: String,
    heading: String,
    heading_path: String,
    body: String,
    tags: Vec<String>,
    frontmatter: String,
    chunk_index: usize,
    token_count: usize,
    keywords: Vec<String>,
    #[serde(default)]
    embedding: Option<Vec<f32>>,
    modified_at: u64,
    size: u64,
}

pub struct SearchIndex {
    root: PathBuf,
    index_path: PathBuf,
    data: PersistedIndex,
}

pub struct SearchQuery {
    pub query: String,
    pub limit: Option<usize>,
    pub path: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl SearchIndex {
    pub fn open(root: impl AsRef<Path>) -> Result<Self, SearchError> {
        let root = root
            .as_ref()
            .canonicalize()
            .map_err(|_| SearchError::NotConfigured)?;
        let index_dir = root.join(".brainstorm/state");
        fs::create_dir_all(&index_dir).map_err(|_| SearchError::Io)?;
        let index_path = index_dir.join("search-index.json");
        let data = match fs::read_to_string(&index_path) {
            Ok(content) => match serde_json::from_str::<PersistedIndex>(&content) {
                Ok(index) if index.version == INDEX_VERSION => index,
                _ => rebuild_data(&root)?,
            },
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => rebuild_data(&root)?,
            Err(_) => return Err(SearchError::Io),
        };
        let mut search_index = Self {
            root,
            index_path,
            data,
        };
        search_index.refresh_stale_documents()?;
        Ok(search_index)
    }

    pub fn query(&mut self, request: SearchQuery) -> Result<Value, SearchError> {
        validate_query(&request.query)?;
        let raw_terms = tokenize(&request.query);
        if raw_terms.is_empty() {
            return Err(SearchError::EmptyQuery);
        }
        let terms = expand_terms(&raw_terms);
        eprintln!(
            "[KB Search] query={:?} normalized_query={:?} expanded_terms={:?} semantic_search=unavailable indexed_chunks={}",
            request.query.chars().take(160).collect::<String>(),
            raw_terms.join(" "),
            terms,
            self.data.chunks.len()
        );
        let limit = request.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);
        let path_prefix = request
            .path
            .as_deref()
            .map(|path| self.validate_filter_path(path))
            .transpose()?;
        let tags = request
            .tags
            .unwrap_or_default()
            .into_iter()
            .map(|tag| normalize_tag(&tag))
            .filter(|tag| !tag.is_empty())
            .collect::<Vec<_>>();

        let mut results = self
            .data
            .chunks
            .iter()
            .filter(|chunk| {
                path_prefix
                    .as_deref()
                    .map(|prefix| {
                        chunk.path == prefix || chunk.path.starts_with(&format!("{prefix}/"))
                    })
                    .unwrap_or(true)
            })
            .filter(|chunk| {
                tags.iter()
                    .all(|tag| chunk.tags.iter().any(|value| value == tag))
            })
            .filter_map(|chunk| {
                score_chunk(chunk, &terms, &request.query).map(|score| (chunk, score))
            })
            .collect::<Vec<_>>();
        results.sort_by(
            |(left_document, left_score), (right_document, right_score)| {
                right_score
                    .partial_cmp(left_score)
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| left_document.path.cmp(&right_document.path))
            },
        );

        let total = results.len();
        eprintln!(
            "[KB Search] ranked_results={:?}",
            results
                .iter()
                .take(limit)
                .map(|(chunk, score)| {
                    format!(
                        "{}#{} heading={:?} score={score:.2}",
                        chunk.path, chunk.chunk_index, chunk.heading
                    )
                })
                .collect::<Vec<_>>()
        );
        let results = results
            .into_iter()
            .take(limit)
            .map(|(chunk, score)| {
                json!({
                    "path": chunk.path,
                    "title": chunk.title,
                    "heading": chunk.heading,
                    "headingPath": chunk.heading_path,
                    "chunkIndex": chunk.chunk_index,
                    "score": score,
                    "snippet": snippet(chunk, &terms),
                    "matches": matched_fields(chunk, &terms),
                })
            })
            .collect::<Vec<_>>();
        eprintln!(
            "[KB Search] completed lexical_candidates={} returned_chunks={} limit={}",
            total,
            results.len(),
            limit
        );
        Ok(json!({ "query": request.query, "results": results, "total": total }))
    }

    pub fn refresh_path(&mut self, path: &Path) -> Result<(), SearchError> {
        let relative = relative_path(&self.root, path)?;
        if !is_markdown_path(path) || relative.starts_with(".brainstorm/") {
            return Ok(());
        }
        self.data.chunks.retain(|chunk| chunk.path != relative);
        self.data.chunks.extend(index_document(path, &relative)?);
        self.persist()
    }

    pub fn remove_path(&mut self, path: &Path) -> Result<(), SearchError> {
        let relative = relative_path(&self.root, path)?;
        self.data.chunks.retain(|chunk| chunk.path != relative);
        self.persist()
    }

    fn refresh_stale_documents(&mut self) -> Result<(), SearchError> {
        let stale = self
            .data
            .chunks
            .iter()
            .filter_map(|chunk| {
                let path = self.root.join(&chunk.path);
                let metadata = fs::metadata(path).ok()?;
                if metadata.len() != chunk.size || modified_at(&metadata) != chunk.modified_at {
                    Some(chunk.path.clone())
                } else {
                    None
                }
            })
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        for path in stale {
            self.refresh_path(&self.root.join(path))?;
        }
        self.data
            .chunks
            .retain(|chunk| self.root.join(&chunk.path).exists());
        self.persist()
    }

    fn validate_filter_path(&self, path: &str) -> Result<String, SearchError> {
        let service = VaultService::new(&self.root)
            .map_err(|_| SearchError::InvalidPath(path.to_string()))?;
        let resolved = service
            .resolve_existing(path)
            .map_err(|_| SearchError::InvalidPath(path.to_string()))?;
        if !resolved.is_dir() {
            return Err(SearchError::InvalidPath(path.to_string()));
        }
        relative_path(&self.root, &resolved)
    }

    fn persist(&self) -> Result<(), SearchError> {
        let content =
            serde_json::to_string_pretty(&self.data).map_err(|_| SearchError::Serialization)?;
        fs::write(&self.index_path, format!("{content}\n")).map_err(|_| SearchError::Io)
    }
}

pub fn ensure_index(root: &Path) -> Result<(), SearchError> {
    let _ = SearchIndex::open(root)?;
    Ok(())
}

pub fn handle_file_event(root: &Path, kind: &str, path: &Path) {
    if !is_markdown_path(path) || path.starts_with(root.join(".brainstorm")) {
        return;
    }
    let Ok(mut index) = SearchIndex::open(root) else {
        return;
    };
    let result = if matches!(kind, "remove") || !path.exists() {
        index.remove_path(path)
    } else {
        index.refresh_path(path)
    };
    if result.is_err() {
        eprintln!("[Search] failed to update index for {}", path.display());
    }
}

fn rebuild_data(root: &Path) -> Result<PersistedIndex, SearchError> {
    let mut chunks = Vec::new();
    let walker = WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }
            !matches!(
                entry.file_name().to_string_lossy().as_ref(),
                ".brainstorm" | ".git" | "node_modules"
            )
        })
        .build();
    for entry in walker.flatten() {
        let path = entry.path();
        if path.is_file() && is_markdown_path(path) {
            let relative = relative_path(root, path)?;
            chunks.extend(index_document(path, &relative)?);
        }
    }
    Ok(PersistedIndex {
        version: INDEX_VERSION,
        chunks,
    })
}

fn index_document(path: &Path, relative: &str) -> Result<Vec<KnowledgeChunk>, SearchError> {
    let content = fs::read_to_string(path).map_err(|_| SearchError::Io)?;
    let document = parse_document(relative, &content).map_err(|_| SearchError::Io)?;
    let metadata = fs::metadata(path).map_err(|_| SearchError::Io)?;
    let filename = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string();
    let title = title_for(&document, &filename);
    let frontmatter = serde_json::to_string(&document.frontmatter).unwrap_or_default();
    let tags = document
        .tags
        .iter()
        .map(|tag| normalize_tag(&tag.value))
        .collect::<Vec<_>>();
    let aliases = frontmatter_strings(&document.frontmatter, "aliases");
    let chunks = split_into_chunks(&title, &document.body, &document.headings);
    Ok(chunks
        .into_iter()
        .enumerate()
        .map(|(chunk_index, (heading, heading_path, body))| {
            let keywords = tokenize(&format!(
                "{} {} {} {} {}",
                title,
                heading,
                aliases.join(" "),
                tags.join(" "),
                body
            ));
            KnowledgeChunk {
                id: format!("{relative}#{chunk_index}"),
                file_id: relative.to_string(),
                path: relative.to_string(),
                filename: filename.clone(),
                title: title.clone(),
                heading,
                heading_path,
                token_count: keywords.len(),
                keywords,
                body,
                tags: tags.clone(),
                frontmatter: frontmatter.clone(),
                chunk_index,
                embedding: None,
                modified_at: modified_at(&metadata),
                size: metadata.len(),
            }
        })
        .collect())
}

fn split_into_chunks(
    title: &str,
    body: &str,
    headings: &[crate::modules::tools::markdown::types::Heading],
) -> Vec<(String, String, String)> {
    let mut chunks = Vec::new();
    let mut heading_index = 0;
    let mut current_heading = "Introduction".to_string();
    let mut heading_stack: Vec<(u8, String)> = Vec::new();
    let mut current_content = String::new();

    for line in body.lines() {
        let heading = headings.get(heading_index).filter(|heading| {
            let prefix = "#".repeat(heading.level as usize);
            line.trim_start()
                .starts_with(&format!("{prefix} {}", heading.text))
        });
        if let Some(heading) = heading {
            if !current_content.trim().is_empty() {
                chunks.push((
                    current_heading.clone(),
                    heading_stack
                        .iter()
                        .map(|(_, value)| value.as_str())
                        .collect::<Vec<_>>()
                        .join(" > "),
                    current_content.trim().to_string(),
                ));
                current_content.clear();
            }
            heading_stack.retain(|(level, _)| *level < heading.level);
            heading_stack.push((heading.level, heading.text.clone()));
            current_heading = heading.text.clone();
            heading_index += 1;
        } else {
            current_content.push_str(line);
            current_content.push('\n');
        }
    }
    if !current_content.trim().is_empty() {
        chunks.push((
            current_heading,
            heading_stack
                .iter()
                .map(|(_, value)| value.as_str())
                .collect::<Vec<_>>()
                .join(" > "),
            current_content.trim().to_string(),
        ));
    }
    if chunks.is_empty() {
        chunks.push((
            "Introduction".to_string(),
            title.to_string(),
            body.trim().to_string(),
        ));
    }
    chunks
}

fn title_for(
    document: &crate::modules::tools::markdown::types::MarkdownDocument,
    filename: &str,
) -> String {
    document
        .headings
        .first()
        .map(|heading| heading.text.clone())
        .or_else(|| {
            frontmatter_strings(&document.frontmatter, "title")
                .into_iter()
                .next()
        })
        .or_else(|| {
            frontmatter_strings(&document.frontmatter, "name")
                .into_iter()
                .next()
        })
        .unwrap_or_else(|| filename.trim_end_matches(".md").to_string())
}

fn frontmatter_strings(value: &Value, key: &str) -> Vec<String> {
    let Some(value) = value.get(key) else {
        return Vec::new();
    };
    match value {
        Value::String(value) => vec![value.clone()],
        Value::Array(values) => values
            .iter()
            .filter_map(|value| value.as_str().map(str::to_string))
            .collect(),
        _ => Vec::new(),
    }
}

fn score_chunk(chunk: &KnowledgeChunk, terms: &[String], raw_query: &str) -> Option<f32> {
    let title_score = field_match_score(&chunk.title, terms);
    let heading_score = field_match_score(&chunk.heading, terms);
    let content_score = field_match_score(&chunk.body, terms);
    let keyword_score = field_match_score(&chunk.keywords.join(" "), terms);
    let phrase_score = phrase_match_score(raw_query, chunk);
    let matched_terms = terms
        .iter()
        .filter(|term| {
            [
                &chunk.title,
                &chunk.heading,
                &chunk.body,
                &chunk.keywords.join(" "),
            ]
            .iter()
            .any(|field| field_match_score(field, std::slice::from_ref(*term)) > 0.0)
        })
        .count();
    if matched_terms == 0 {
        return None;
    }
    let coverage = matched_terms as f32 / terms.len().max(1) as f32;
    let score = (title_score * 0.30
        + heading_score * 0.30
        + phrase_score * 0.20
        + keyword_score * 0.15
        + content_score * 0.05)
        * (0.7 + coverage * 0.3)
        * 100.0;
    Some(score)
}

fn matched_fields(chunk: &KnowledgeChunk, terms: &[String]) -> Vec<Value> {
    let fields = [
        ("title", &chunk.title),
        ("heading", &chunk.heading_path),
        ("keywords", &chunk.keywords.join(" ")),
        ("tags", &chunk.tags.join(" ")),
        ("frontmatter", &chunk.frontmatter),
        ("body", &chunk.body),
    ];
    fields
        .into_iter()
        .filter(|(_, field)| field_match_score(field, terms) > 0.0)
        .map(|(field, _)| json!({ "field": field }))
        .collect()
}

fn snippet(chunk: &KnowledgeChunk, terms: &[String]) -> String {
    let body = chunk.body.trim();
    let lower = normalize_text(body);
    let start = terms
        .iter()
        .filter_map(|term| lower.find(term))
        .min()
        .unwrap_or(0);
    let start = start.saturating_sub(80);
    let snippet = body
        .chars()
        .skip(start)
        .take(MAX_SNIPPET_LENGTH)
        .collect::<String>();
    if start > 0 {
        format!("…{snippet}")
    } else {
        snippet
    }
}

fn field_match_score(field: &str, terms: &[String]) -> f32 {
    let field_terms = tokenize(field);
    if field_terms.is_empty() {
        return 0.0;
    }
    terms
        .iter()
        .filter(|term| {
            field_terms
                .iter()
                .any(|candidate| related_terms(term, candidate))
        })
        .count() as f32
        / terms.len().max(1) as f32
}

fn phrase_match_score(raw_query: &str, chunk: &KnowledgeChunk) -> f32 {
    let terms = tokenize(raw_query);
    if terms.len() < 2 {
        return 0.0;
    }
    let fields = [&chunk.title, &chunk.heading_path, &chunk.body];
    let phrase_length = terms.len();
    fields
        .iter()
        .map(|field| {
            let field_terms = tokenize(field);
            field_terms.windows(phrase_length).any(|window| {
                window
                    .iter()
                    .zip(terms.iter())
                    .all(|(candidate, term)| related_terms(term, candidate))
            }) as u8 as f32
        })
        .fold(0.0, f32::max)
}

fn related_terms(query_term: &str, candidate: &str) -> bool {
    if query_term == candidate || concept_equivalent(query_term, candidate) {
        return true;
    }
    let common_prefix = query_term
        .chars()
        .zip(candidate.chars())
        .take_while(|(left, right)| left == right)
        .count();
    common_prefix >= 5 && (query_term.len() >= 6 || candidate.len() >= 6)
}

fn expand_terms(terms: &[String]) -> Vec<String> {
    let mut expanded = terms.to_vec();
    for term in terms {
        let concept = if [
            "compos",
            "component",
            "constituent",
            "ingredient",
            "substance",
        ]
        .iter()
        .any(|prefix| term.starts_with(prefix))
        {
            Some("compos")
        } else if ["contain", "consist"]
            .iter()
            .any(|prefix| term.starts_with(prefix))
        {
            Some("compos")
        } else if ["effect", "affect", "impact"]
            .iter()
            .any(|prefix| term.starts_with(prefix))
        {
            Some("effect")
        } else if ["deliver", "inject", "transport"]
            .iter()
            .any(|prefix| term.starts_with(prefix))
        {
            Some("deliver")
        } else {
            None
        };
        if let Some(concept) = concept {
            if !expanded.iter().any(|candidate| candidate == concept) {
                expanded.push(concept.to_string());
            }
        }
    }
    expanded
}

fn concept_equivalent(left: &str, right: &str) -> bool {
    let concept = |term: &str| -> String {
        if [
            "compos",
            "component",
            "constituent",
            "ingredient",
            "substance",
            "contain",
            "consist",
        ]
        .iter()
        .any(|prefix| term.starts_with(prefix))
        {
            "composition".to_string()
        } else if ["effect", "affect", "impact"]
            .iter()
            .any(|prefix| term.starts_with(prefix))
        {
            "effect".to_string()
        } else if ["deliver", "inject", "transport"]
            .iter()
            .any(|prefix| term.starts_with(prefix))
        {
            "delivery".to_string()
        } else {
            term.to_string()
        }
    };
    let left_concept = concept(left);
    let right_concept = concept(right);
    left_concept == right_concept && left_concept != left
}

fn tokenize(value: &str) -> Vec<String> {
    normalize_text(value)
        .split_whitespace()
        .map(str::to_string)
        .filter(|term| !is_stop_word(term))
        .map(|term| stem_token(&term))
        .filter(|term| !term.is_empty())
        .collect()
}

fn normalize_text(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || character == '_' {
                character.to_ascii_lowercase()
            } else {
                ' '
            }
        })
        .collect::<String>()
}

fn stem_token(token: &str) -> String {
    let suffixes = ["ing", "ed", "ion", "ions", "es", "s"];
    suffixes
        .iter()
        .find_map(|suffix| {
            token
                .strip_suffix(suffix)
                .filter(|root| root.len() >= 5)
                .map(str::to_string)
        })
        .unwrap_or_else(|| token.to_string())
}

fn is_stop_word(term: &str) -> bool {
    matches!(
        term,
        "a" | "an"
            | "the"
            | "is"
            | "are"
            | "was"
            | "were"
            | "what"
            | "which"
            | "who"
            | "where"
            | "when"
            | "why"
            | "how"
            | "of"
            | "to"
            | "in"
            | "on"
            | "for"
            | "with"
            | "and"
            | "or"
            | "from"
            | "about"
            | "does"
            | "do"
            | "did"
            | "can"
            | "could"
            | "would"
            | "should"
    )
}

fn normalize_tag(tag: &str) -> String {
    tag.trim().trim_start_matches('#').to_lowercase()
}

fn validate_query(query: &str) -> Result<(), SearchError> {
    if query.trim().is_empty() {
        return Err(SearchError::EmptyQuery);
    }
    if query.len() > MAX_QUERY_LENGTH {
        return Err(SearchError::QueryTooLong);
    }
    Ok(())
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn relative_path(root: &Path, path: &Path) -> Result<String, SearchError> {
    path.strip_prefix(root)
        .map_err(|_| SearchError::InvalidPath(path.display().to_string()))
        .map(|path| path.to_string_lossy().replace('\\', "/"))
}

fn modified_at(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{SearchIndex, SearchQuery};
    use serde_json::Value;
    use std::{fs, path::PathBuf};

    fn test_root(name: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("brainstorm-search-{name}-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        root.canonicalize().unwrap()
    }

    fn write(root: &PathBuf, path: &str, content: &str) {
        let file = root.join(path);
        fs::create_dir_all(file.parent().unwrap()).unwrap();
        fs::write(file, content).unwrap();
    }

    fn result_paths(value: &Value) -> Vec<String> {
        value["results"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|result| result["path"].as_str().map(str::to_string))
            .collect()
    }

    #[test]
    fn searches_titles_aliases_tags_and_paths() {
        let root = test_root("fields");
        write(
            &root,
            "Projects/Architecture.md",
            "---\naliases: [brain]\ntags: [\"#ai\"]\n---\n# Brainstorm Architecture\nAgent Runtime design.\n",
        );
        write(
            &root,
            "Notes/Other.md",
            "# Other\nAgent Runtime appears here.\n",
        );

        let mut index = SearchIndex::open(&root).unwrap();
        let title_results = index
            .query(SearchQuery {
                query: "Brainstorm".into(),
                limit: None,
                path: None,
                tags: None,
            })
            .unwrap();
        assert_eq!(
            result_paths(&title_results),
            vec!["Projects/Architecture.md"]
        );

        let alias_results = index
            .query(SearchQuery {
                query: "brain".into(),
                limit: None,
                path: None,
                tags: Some(vec!["#ai".into()]),
            })
            .unwrap();
        assert_eq!(
            result_paths(&alias_results),
            vec!["Projects/Architecture.md"]
        );

        let path_results = index
            .query(SearchQuery {
                query: "agent".into(),
                limit: None,
                path: Some("Projects".into()),
                tags: None,
            })
            .unwrap();
        assert_eq!(
            result_paths(&path_results),
            vec!["Projects/Architecture.md"]
        );
    }

    #[test]
    fn updates_and_removes_documents_incrementally() {
        let root = test_root("updates");
        write(&root, "Notes/One.md", "# First\nalpha\n");
        let mut index = SearchIndex::open(&root).unwrap();

        write(&root, "Notes/One.md", "# First\nbeta\n");
        index.refresh_path(&root.join("Notes/One.md")).unwrap();
        let beta = index
            .query(SearchQuery {
                query: "beta".into(),
                limit: Some(1),
                path: None,
                tags: None,
            })
            .unwrap();
        assert_eq!(beta["total"], 1);

        index.remove_path(&root.join("Notes/One.md")).unwrap();
        let removed = index
            .query(SearchQuery {
                query: "beta".into(),
                limit: None,
                path: None,
                tags: None,
            })
            .unwrap();
        assert_eq!(removed["total"], 0);
    }

    #[test]
    fn enforces_result_limit_and_empty_query_validation() {
        let root = test_root("limits");
        for number in 0..60 {
            write(&root, &format!("{number}.md"), "# Shared\nshared\n");
        }
        let mut index = SearchIndex::open(&root).unwrap();
        let results = index
            .query(SearchQuery {
                query: "shared".into(),
                limit: Some(1000),
                path: None,
                tags: None,
            })
            .unwrap();
        assert_eq!(results["results"].as_array().unwrap().len(), 50);
        assert!(index
            .query(SearchQuery {
                query: " ".into(),
                limit: None,
                path: None,
                tags: None,
            })
            .is_err());
    }

    #[test]
    fn matches_composed_query_to_composition_heading_chunk() {
        let root = test_root("semantic-lexical");
        write(
            &root,
            "snake-venom.md",
            "# Snake Venom Composition and Effects\n\n## Introduction\n\nSnakes use venom for defense.\n\n## Composition of Snake Venom\n\nThe venom is a complex mixture of enzymes, peptides, and proteins.\n\n## Effects of Snake Venom\n\nThe venom affects tissues.\n",
        );
        let mut index = SearchIndex::open(&root).unwrap();
        let results = index
            .query(SearchQuery {
                query: "What snake venom is composed of?".into(),
                limit: Some(5),
                path: None,
                tags: None,
            })
            .unwrap();
        let first = &results["results"].as_array().unwrap()[0];
        assert_eq!(first["path"], "snake-venom.md");
        assert_eq!(first["heading"], "Composition of Snake Venom");
        assert!(first["snippet"]
            .as_str()
            .unwrap()
            .contains("enzymes, peptides"));
    }
}
