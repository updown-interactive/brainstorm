use std::{collections::HashSet, fs, path::Path};

use ignore::WalkBuilder;
use serde_json::{Map, Value};

use super::markdown::{frontmatter::split_frontmatter, parse_document};

pub const DEFAULT_RELEVANCE_THRESHOLD: f32 = 0.65;
pub const DEFAULT_MAX_KNOWLEDGE_LINKS: usize = 5;

#[derive(Debug, Clone, Copy)]
pub struct KnowledgeLinkerConfig {
    pub relevance_threshold: f32,
    pub max_links: usize,
}

impl Default for KnowledgeLinkerConfig {
    fn default() -> Self {
        Self {
            relevance_threshold: DEFAULT_RELEVANCE_THRESHOLD,
            max_links: DEFAULT_MAX_KNOWLEDGE_LINKS,
        }
    }
}

#[derive(Debug, Clone)]
pub struct KnowledgeCandidate {
    pub name: String,
    pub aliases: Vec<String>,
    pub summary: String,
    pub description: String,
    pub tags: Vec<String>,
    pub domain: String,
    pub knowledge_type: String,
    pub concepts: Vec<String>,
    pub keywords: Vec<String>,
}

impl KnowledgeCandidate {
    pub fn from_parts(properties: &Value, body: &str) -> Self {
        let strings = |key: &str| value_strings(properties.get(key));
        let name = strings("name").into_iter().next().unwrap_or_default();
        let aliases = strings("aliases");
        let summary = strings("summary").join(" ");
        let description = strings("description").join(" ");
        let tags = strings("tags");
        let domain = strings("domain").join(" ");
        let knowledge_type = strings("type").join(" ");
        let concepts = significant_tokens(&format!(
            "{} {} {} {} {} {} {}",
            name,
            aliases.join(" "),
            summary,
            description,
            tags.join(" "),
            domain,
            body
        ));
        let keywords = significant_tokens(&format!("{} {} {}", name, summary, body));
        Self {
            name,
            aliases,
            summary,
            description,
            tags,
            domain,
            knowledge_type,
            concepts,
            keywords,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct KnowledgeRelation {
    pub path: String,
    pub name: String,
    pub score: f32,
}

pub fn discover_links(
    root: &Path,
    new_relative_path: &str,
    candidate: &KnowledgeCandidate,
) -> Result<Vec<KnowledgeRelation>, String> {
    discover_links_with_config(
        root,
        new_relative_path,
        candidate,
        KnowledgeLinkerConfig::default(),
    )
}

pub fn discover_links_with_config(
    root: &Path,
    new_relative_path: &str,
    candidate: &KnowledgeCandidate,
    config: KnowledgeLinkerConfig,
) -> Result<Vec<KnowledgeRelation>, String> {
    let mut relations = Vec::new();
    let walker = WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(|entry| {
            entry.depth() == 0
                || !matches!(
                    entry.file_name().to_string_lossy().as_ref(),
                    ".brainstorm" | ".git" | "node_modules"
                )
        })
        .build();
    for entry in walker.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_markdown(path) {
            continue;
        }
        let relative = path
            .strip_prefix(root)
            .map_err(|_| "knowledge path escaped project root")?
            .to_string_lossy()
            .replace('\\', "/");
        if relative == new_relative_path.trim_matches('/') {
            continue;
        }
        let content = fs::read_to_string(path).map_err(|_| "could not read knowledge file")?;
        let document = match parse_document(&relative, &content) {
            Ok(document) => document,
            Err(error) => {
                eprintln!(
                    "[KnowledgeLinker] skipping invalid document path={} error={error}",
                    relative
                );
                continue;
            }
        };
        let name = canonical_name(&document.frontmatter, &document);
        if is_same_knowledge(candidate, &name, &document.frontmatter, path) {
            continue;
        }
        let score = relation_score(candidate, &name, &document);
        if score >= config.relevance_threshold {
            relations.push(KnowledgeRelation {
                path: relative,
                name,
                score,
            });
        }
    }
    relations.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| left.name.cmp(&right.name))
    });
    relations.truncate(config.max_links);
    eprintln!(
        "[KnowledgeLinker] candidates_above_threshold={} selected_links={} links={:?}",
        relations.len(),
        relations.len(),
        relations
            .iter()
            .map(|relation| relation.name.as_str())
            .collect::<Vec<_>>()
    );
    Ok(relations)
}

pub fn merge_links(properties: &mut Value, generated_names: Vec<String>) -> Vec<String> {
    let mut links = Vec::new();
    if let Some(existing) = properties.get("links") {
        links.extend(
            value_strings(Some(existing))
                .into_iter()
                .map(|value| normalize_link(&value)),
        );
    }
    links.extend(
        generated_names
            .into_iter()
            .map(|name| format!("[[{}]]", name.trim())),
    );
    let mut seen = HashSet::new();
    links.retain(|link| !link.trim().is_empty() && seen.insert(normalize_link_target(link)));
    if let Some(object) = properties.as_object_mut() {
        object.insert(
            "links".into(),
            Value::Array(links.iter().cloned().map(Value::String).collect()),
        );
    }
    links
}

pub fn update_backlinks(
    root: &Path,
    relations: &[KnowledgeRelation],
    new_name: &str,
) -> Result<usize, String> {
    let mut updated = 0;
    for relation in relations.iter().take(DEFAULT_MAX_KNOWLEDGE_LINKS) {
        let path = root.join(&relation.path);
        let content = fs::read_to_string(&path)
            .map_err(|_| format!("could not read backlink target {}", relation.path))?;
        let (mut properties, body) =
            split_frontmatter(&content).map_err(|error| error.to_string())?;
        if !properties.is_object() {
            properties = Value::Object(Map::new());
        }
        merge_links(&mut properties, vec![new_name.to_string()]);
        let yaml = serde_yaml::to_string(&properties)
            .map_err(|_| "could not serialize backlink metadata")?;
        let updated_content = format!("---\n{}---\n{}", yaml.trim_end(), body);
        fs::write(path, updated_content)
            .map_err(|_| format!("could not write backlink target {}", relation.path))?;
        updated += 1;
    }
    eprintln!("[KnowledgeLinker] backlinks_updated={updated}");
    Ok(updated)
}

fn relation_score(
    candidate: &KnowledgeCandidate,
    name: &str,
    document: &super::markdown::types::MarkdownDocument,
) -> f32 {
    let candidate_terms = set(&candidate.concepts);
    let name_terms = set(&significant_tokens(name));
    let alias_terms = set(&value_strings(document.frontmatter.get("aliases"))
        .into_iter()
        .flat_map(|value| significant_tokens(&value))
        .collect::<Vec<_>>());
    let metadata = format!(
        "{} {} {} {}",
        document.frontmatter.get("summary").unwrap_or(&Value::Null),
        document
            .frontmatter
            .get("description")
            .unwrap_or(&Value::Null),
        document.frontmatter.get("domain").unwrap_or(&Value::Null),
        document.frontmatter.get("type").unwrap_or(&Value::Null)
    );
    let metadata_terms = set(&significant_tokens(&metadata));
    let tag_terms = set(&document
        .tags
        .iter()
        .flat_map(|tag| significant_tokens(&tag.value))
        .collect::<Vec<_>>());
    let heading_terms = set(&document
        .headings
        .iter()
        .flat_map(|heading| significant_tokens(&heading.text))
        .collect::<Vec<_>>());
    let body_terms = set(&significant_tokens(&document.body));
    let name_score = overlap_ratio(
        &candidate_terms,
        &name_terms.union(&alias_terms).cloned().collect(),
    );
    let metadata_score = overlap_ratio(&candidate_terms, &metadata_terms);
    let tag_score = overlap_ratio(
        &set(&candidate
            .tags
            .iter()
            .flat_map(|tag| significant_tokens(tag))
            .collect::<Vec<_>>()),
        &tag_terms,
    );
    let heading_score = overlap_ratio(&candidate_terms, &heading_terms);
    let body_score = overlap_ratio(&set(&candidate.keywords), &body_terms);
    (name_score * 0.45
        + metadata_score * 0.15
        + tag_score * 0.15
        + heading_score * 0.10
        + body_score * 0.15)
        .min(1.0)
}

fn overlap_ratio(left: &HashSet<String>, right: &HashSet<String>) -> f32 {
    if left.is_empty() || right.is_empty() {
        return 0.0;
    }
    let matched = left
        .iter()
        .filter(|left_token| {
            right
                .iter()
                .any(|right_token| related_tokens(left_token, right_token))
        })
        .count();
    matched as f32 / left.len().min(right.len()) as f32
}

fn related_tokens(left: &str, right: &str) -> bool {
    left == right
        || matches!(
            (left, right),
            ("borrow", "borrowing")
                | ("borrowing", "borrow")
                | ("reference", "references")
                | ("references", "reference")
                | ("concurrency", "concurrent")
                | ("concurrent", "concurrency")
                | ("safety", "secure")
                | ("secure", "safety")
                | ("management", "ownership")
                | ("ownership", "management")
                | ("language", "languages")
                | ("languages", "language")
        )
}

fn is_same_knowledge(
    candidate: &KnowledgeCandidate,
    name: &str,
    properties: &Value,
    path: &Path,
) -> bool {
    let identities = std::iter::once(name.to_string())
        .chain(value_strings(properties.get("aliases")))
        .chain(
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .map(str::to_string),
        )
        .collect::<Vec<_>>();
    let candidate_identities = std::iter::once(candidate.name.clone())
        .chain(candidate.aliases.clone())
        .collect::<Vec<_>>();
    identities.iter().any(|identity| {
        candidate_identities.iter().any(|candidate_identity| {
            normalize_text(identity) == normalize_text(candidate_identity)
        })
    })
}

fn canonical_name(
    frontmatter: &Value,
    document: &super::markdown::types::MarkdownDocument,
) -> String {
    value_strings(frontmatter.get("name"))
        .into_iter()
        .next()
        .or_else(|| {
            document
                .headings
                .first()
                .map(|heading| heading.text.clone())
        })
        .or_else(|| {
            Path::new(&document.path)
                .file_stem()
                .and_then(|value| value.to_str())
                .map(str::to_string)
        })
        .unwrap_or_default()
}

fn normalize_link(value: &str) -> String {
    let target = normalize_link_target(value);
    format!("[[{target}]]")
}

fn normalize_link_target(value: &str) -> String {
    value
        .trim()
        .trim_start_matches("[[")
        .trim_end_matches("]]")
        .split('|')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn value_strings(value: Option<&Value>) -> Vec<String> {
    match value {
        Some(Value::String(value)) => vec![value.clone()],
        Some(Value::Array(values)) => values
            .iter()
            .flat_map(|value| value_strings(Some(value)))
            .collect(),
        Some(Value::Number(value)) => vec![value.to_string()],
        Some(Value::Bool(value)) => vec![value.to_string()],
        _ => Vec::new(),
    }
}

fn significant_tokens(value: &str) -> Vec<String> {
    value
        .split(|character: char| !character.is_alphanumeric())
        .map(str::to_lowercase)
        .filter(|token| token.len() >= 3 && !is_generic(token))
        .collect()
}

fn is_generic(token: &str) -> bool {
    matches!(
        token,
        "the"
            | "and"
            | "for"
            | "with"
            | "from"
            | "this"
            | "that"
            | "knowledge"
            | "documentation"
            | "information"
            | "project"
            | "brainstorm"
            | "note"
            | "notes"
            | "article"
            | "content"
            | "active"
            | "personal"
    )
}

fn set(values: &[String]) -> HashSet<String> {
    values.iter().cloned().collect()
}
fn normalize_text(value: &str) -> String {
    significant_tokens(value).join(" ")
}
fn is_markdown(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some("md" | "mdx")
    )
}

#[cfg(test)]
mod tests {
    use super::{discover_links, update_backlinks, KnowledgeCandidate};
    use serde_json::json;
    use std::{fs, path::PathBuf};

    fn vault() -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("brainstorm-linker-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn candidate(name: &str) -> KnowledgeCandidate {
        KnowledgeCandidate::from_parts(
            &json!({
                "name": name,
                "aliases": [name.to_lowercase()],
                "summary": format!("{name} concepts"),
                "tags": ["#programming"]
            }),
            "# Article\nRust ownership borrowing memory safety",
        )
    }

    #[test]
    fn selects_strong_related_files_and_excludes_unrelated_files() {
        let root = vault();
        fs::write(
            root.join("Rust.md"),
            "---\nname: Rust\n---\n# Rust\nA systems programming language\n",
        )
        .unwrap();
        fs::write(
            root.join("Memory Safety.md"),
            "---\nname: Memory Safety\n---\n# Memory Safety\nOwnership and borrowing prevent memory errors.\n",
        )
        .unwrap();
        fs::write(
            root.join("Cooking.md"),
            "---\nname: Cooking\n---\n# Cooking\nRecipes and ingredients.\n",
        )
        .unwrap();

        let links =
            discover_links(&root, "Rust Ownership.md", &candidate("Rust Ownership")).unwrap();
        let names = links
            .iter()
            .map(|link| link.name.as_str())
            .collect::<Vec<_>>();
        assert!(names.contains(&"Rust"));
        assert!(names.contains(&"Memory Safety"));
        assert!(!names.contains(&"Cooking"));
        assert!(links.iter().all(|link| link.score >= 0.65));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn returns_no_links_when_the_knowledge_base_is_unrelated() {
        let root = vault();
        fs::write(
            root.join("Cooking.md"),
            "---\nname: Cooking\ntags: ['#food']\n---\n# Cooking\nRecipes and ingredients.\n",
        )
        .unwrap();
        fs::write(
            root.join("Photography.md"),
            "---\nname: Photography\n---\n# Photography\nCameras and lenses.\n",
        )
        .unwrap();
        let links =
            discover_links(&root, "Rust Ownership.md", &candidate("Rust Ownership")).unwrap();
        assert!(links.is_empty());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn preserves_manual_links_and_deduplicates_generated_links() {
        let mut properties = json!({"name": "Rust Ownership", "links": ["[[Rust]]", "[[Rust]]"]});
        let links = super::merge_links(
            &mut properties,
            vec!["Rust".into(), "Memory Safety".into(), "Rust".into()],
        );
        assert_eq!(links, vec!["[[Rust]]", "[[Memory Safety]]"]);
        assert_eq!(properties["links"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn prevents_self_links_and_updates_backlinks_without_changing_body() {
        let root = vault();
        let existing = "---\nname: Rust\ntags:\n- '#rust'\naliases:\n- rust-lang\nlinks:\n- '[[Systems]]'\nsummary: Keep this.\n---\n# Rust\n\nBody stays exactly the same.\n";
        fs::write(root.join("Rust.md"), existing).unwrap();
        fs::write(
            root.join("Systems.md"),
            "---\nname: Systems\ntags:\n- '#systems'\naliases:\n- systems-programming\nsummary: Keep this summary.\n---\n# Systems\nRust systems programming\n",
        )
        .unwrap();
        let links = discover_links(&root, "Rust.md", &candidate("Rust")).unwrap();
        assert!(links.iter().all(|link| link.name != "Rust"));
        update_backlinks(&root, &links, "Rust Ownership").unwrap();
        let updated = fs::read_to_string(root.join("Systems.md")).unwrap();
        assert!(updated.contains("[[Rust Ownership]]"));
        assert!(updated.contains("tags:"));
        assert!(updated.contains("'#systems'"));
        assert!(updated.contains("systems-programming"));
        assert!(updated.contains("Keep this summary."));
        assert!(updated.contains("# Systems\nRust systems programming\n"));
        fs::remove_dir_all(root).unwrap();
    }
}
