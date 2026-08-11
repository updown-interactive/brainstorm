use std::{
    cmp::Ordering,
    fs,
    path::{Path, PathBuf},
};

use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::modules::{tools::markdown::parse_document, vault::VaultService};

const INDEX_VERSION: u32 = 1;
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
    documents: Vec<IndexedDocument>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct IndexedDocument {
    path: String,
    filename: String,
    title: String,
    aliases: Vec<String>,
    headings: Vec<String>,
    body: String,
    tags: Vec<String>,
    frontmatter: String,
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
        let terms = tokenize(&request.query);
        if terms.is_empty() {
            return Err(SearchError::EmptyQuery);
        }
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
            .documents
            .iter()
            .filter(|document| {
                path_prefix
                    .as_deref()
                    .map(|prefix| {
                        document.path == prefix || document.path.starts_with(&format!("{prefix}/"))
                    })
                    .unwrap_or(true)
            })
            .filter(|document| {
                tags.iter()
                    .all(|tag| document.tags.iter().any(|value| value == tag))
            })
            .filter_map(|document| score_document(document, &terms).map(|score| (document, score)))
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
        let results = results
            .into_iter()
            .take(limit)
            .map(|(document, score)| {
                json!({
                    "path": document.path,
                    "title": document.title,
                    "score": score,
                    "snippet": snippet(document, &terms),
                    "matches": matched_fields(document, &terms),
                })
            })
            .collect::<Vec<_>>();
        Ok(json!({ "query": request.query, "results": results, "total": total }))
    }

    pub fn refresh_path(&mut self, path: &Path) -> Result<(), SearchError> {
        let relative = relative_path(&self.root, path)?;
        if !is_markdown_path(path) || relative.starts_with(".brainstorm/") {
            return Ok(());
        }
        let Some(existing) = self
            .data
            .documents
            .iter_mut()
            .find(|doc| doc.path == relative)
        else {
            self.data.documents.push(index_document(path, &relative)?);
            return self.persist();
        };
        *existing = index_document(path, &relative)?;
        self.persist()
    }

    pub fn remove_path(&mut self, path: &Path) -> Result<(), SearchError> {
        let relative = relative_path(&self.root, path)?;
        self.data
            .documents
            .retain(|document| document.path != relative);
        self.persist()
    }

    fn refresh_stale_documents(&mut self) -> Result<(), SearchError> {
        let stale = self
            .data
            .documents
            .iter()
            .filter_map(|document| {
                let path = self.root.join(&document.path);
                let metadata = fs::metadata(path).ok()?;
                if metadata.len() != document.size || modified_at(&metadata) != document.modified_at
                {
                    Some(document.path.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        for path in stale {
            self.refresh_path(&self.root.join(path))?;
        }
        self.data
            .documents
            .retain(|document| self.root.join(&document.path).exists());
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
    let mut documents = Vec::new();
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
            documents.push(index_document(path, &relative)?);
        }
    }
    Ok(PersistedIndex {
        version: INDEX_VERSION,
        documents,
    })
}

fn index_document(path: &Path, relative: &str) -> Result<IndexedDocument, SearchError> {
    let content = fs::read_to_string(path).map_err(|_| SearchError::Io)?;
    let document = parse_document(relative, &content).map_err(|_| SearchError::Io)?;
    let metadata = fs::metadata(path).map_err(|_| SearchError::Io)?;
    let filename = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string();
    let title = title_for(&document, &filename);
    let aliases = frontmatter_strings(&document.frontmatter, "aliases");
    let frontmatter = serde_json::to_string(&document.frontmatter).unwrap_or_default();
    Ok(IndexedDocument {
        path: relative.to_string(),
        filename,
        title,
        aliases,
        headings: document
            .headings
            .into_iter()
            .map(|heading| heading.text)
            .collect(),
        body: document.body,
        tags: document
            .tags
            .into_iter()
            .map(|tag| normalize_tag(&tag.value))
            .collect(),
        frontmatter,
        modified_at: modified_at(&metadata),
        size: metadata.len(),
    })
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

fn score_document(document: &IndexedDocument, terms: &[String]) -> Option<f32> {
    let fields = [
        (&document.title, 8.0),
        (&document.filename, 7.0),
        (&document.aliases.join(" "), 7.0),
        (&document.headings.join(" "), 5.0),
        (&document.tags.join(" "), 5.0),
        (&document.frontmatter, 3.0),
        (&document.body, 1.0),
    ];
    let mut score = 0.0;
    for term in terms {
        let mut term_score = 0.0;
        for (field, weight) in fields.iter() {
            let count = occurrences(field, term);
            term_score += count as f32 * *weight;
        }
        if term_score == 0.0 {
            return None;
        }
        score += term_score;
    }
    Some(score)
}

fn matched_fields(document: &IndexedDocument, terms: &[String]) -> Vec<Value> {
    let fields = [
        ("title", &document.title),
        ("aliases", &document.aliases.join(" ")),
        ("headings", &document.headings.join(" ")),
        ("tags", &document.tags.join(" ")),
        ("frontmatter", &document.frontmatter),
        ("body", &document.body),
    ];
    fields
        .into_iter()
        .filter(|(_, field)| terms.iter().any(|term| field.to_lowercase().contains(term)))
        .map(|(field, _)| json!({ "field": field }))
        .collect()
}

fn snippet(document: &IndexedDocument, terms: &[String]) -> String {
    let body = document.body.trim();
    let lower = body.to_lowercase();
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

fn occurrences(field: &str, term: &str) -> usize {
    let lower = field.to_lowercase();
    lower.match_indices(term).count()
}

fn tokenize(value: &str) -> Vec<String> {
    value
        .split_whitespace()
        .map(|term| {
            term.trim_matches(|c: char| {
                !c.is_alphanumeric() && c != '#' && c != '_' && c != '/' && c != '-'
            })
            .to_lowercase()
        })
        .filter(|term| !term.is_empty())
        .collect()
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
}
