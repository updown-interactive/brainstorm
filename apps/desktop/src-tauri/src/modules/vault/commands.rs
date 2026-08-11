use crate::modules::filesystem::commands::build_walker;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::State;

pub type VaultState = Mutex<Option<VaultIndex>>;

/// Reads one Markdown document after enforcing the vault root boundary.
pub fn read_markdown_document(root: &Path, relative_path: &str) -> Result<String, String> {
    let extension = Path::new(relative_path).extension().and_then(|value| value.to_str()).unwrap_or_default();
    if !matches!(extension, "md" | "mdx") {
        return Err("unsupported document type".into());
    }
    crate::modules::vault::service::VaultService::new(root)
        .map_err(|error| error.to_string())?
        .read_file(relative_path)
        .map_err(|error| error.to_string())
}

#[derive(Debug, Clone, Default)]
pub struct VaultIndex {
    pub root: String,
    pub files: HashMap<String, IndexedFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedFile {
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub modified_ms: u64,
    pub frontmatter: HashMap<String, Value>,
    pub links: Vec<IndexedLink>,
    pub tags: Vec<String>,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedLink {
    pub target: String,
    pub link_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct VaultSummary {
    pub root: String,
    pub files: Vec<IndexedFile>,
}

#[tauri::command]
pub async fn build_vault_index(
    path: String,
    state: State<'_, VaultState>,
) -> Result<VaultSummary, String> {
    let root = path.clone();
    let index = tokio::task::spawn_blocking(move || build_index_blocking(root))
        .await
        .map_err(|e| e.to_string())??;
    let summary = summarize_index(&index);
    *state.lock().map_err(|e| e.to_string())? = Some(index);
    Ok(summary)
}

#[tauri::command]
pub async fn get_vault_index(state: State<'_, VaultState>) -> Result<VaultSummary, String> {
    let guard = state.lock().map_err(|e| e.to_string())?;
    guard
        .as_ref()
        .map(summarize_index)
        .ok_or_else(|| "Vault index has not been built".to_string())
}

#[tauri::command]
pub async fn update_index_entry(
    path: String,
    kind: Option<String>,
    state: State<'_, VaultState>,
) -> Result<(), String> {
    let current_root = {
        let guard = state.lock().map_err(|e| e.to_string())?;
        guard.as_ref().map(|index| index.root.clone())
    };
    let Some(root) = current_root else {
        return Ok(());
    };

    let changed_path = path.clone();
    let entry = tokio::task::spawn_blocking(move || {
        if matches!(kind.as_deref(), Some("remove")) {
            return Ok(None);
        }
        let path = Path::new(&changed_path);
        if !is_markdown_file(path) || !path.exists() || !path.is_file() {
            return Ok(None);
        }
        parse_indexed_file(&root, path).map(Some)
    })
    .await
    .map_err(|e| e.to_string())??;

    let mut guard = state.lock().map_err(|e| e.to_string())?;
    if let Some(index) = guard.as_mut() {
        if let Some(file) = entry {
            index.files.insert(file.path.clone(), file);
        } else {
            index.files.remove(&path);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn rename_path_with_link_update(
    old_path: String,
    new_path: String,
    state: State<'_, VaultState>,
) -> Result<(), String> {
    let backlink_paths = {
        let guard = state.lock().map_err(|e| e.to_string())?;
        guard
            .as_ref()
            .map(|index| backlinks_for_path(index, &old_path))
            .unwrap_or_default()
    };
    let old_stem = file_stem(&old_path);
    let new_stem = file_stem(&new_path);
    let old_path_for_index = old_path.clone();
    let new_path_for_index = new_path.clone();

    tokio::task::spawn_blocking(move || {
        std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
        for backlink_path in backlink_paths {
            rewrite_wikilinks_in_file(&backlink_path, &old_stem, &new_stem)?;
        }
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    update_index_entry(
        old_path_for_index,
        Some("remove".to_string()),
        state.clone(),
    )
    .await?;
    update_index_entry(new_path_for_index, Some("create".to_string()), state).await?;
    Ok(())
}

fn build_index_blocking(root: String) -> Result<VaultIndex, String> {
    let root_path = Path::new(&root);
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Path does not exist or is not a directory".to_string());
    }

    let mut files = HashMap::new();
    let walker = build_walker(&root, false).build();

    for result in walker {
        let entry = match result {
            Ok(entry) => entry,
            Err(error) => {
                eprintln!("Error reading vault entry: {}", error);
                continue;
            }
        };
        let path = entry.path();
        if path == root_path || !is_markdown_file(path) {
            continue;
        }
        if let Ok(file) = parse_indexed_file(&root, path) {
            files.insert(file.path.clone(), file);
        }
    }

    Ok(VaultIndex { root, files })
}

fn parse_indexed_file(root: &str, path: &Path) -> Result<IndexedFile, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0);
    let (frontmatter, body) = parse_frontmatter(&content);
    let visible_body = strip_invisible_markdown(body);
    let tags = unique_strings(
        [
            string_array(frontmatter.get("tags"))
                .into_iter()
                .map(|tag| normalize_tag(&tag))
                .collect::<Vec<_>>(),
            extract_body_tags(&visible_body),
        ]
        .concat(),
    );
    let aliases = string_array(frontmatter.get("aliases"));
    let mut links = extract_frontmatter_links(frontmatter.get("links"));
    links.extend(extract_wiki_links(&visible_body));
    links.extend(extract_markdown_links(&visible_body));

    Ok(IndexedFile {
        name: path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default(),
        path: path.to_string_lossy().to_string(),
        relative_path: relative_path(root, path),
        modified_ms,
        frontmatter,
        links,
        tags,
        aliases,
    })
}

fn parse_frontmatter(content: &str) -> (HashMap<String, Value>, &str) {
    let normalized = content
        .strip_prefix("---\r\n")
        .or_else(|| content.strip_prefix("---\n"));
    let Some(after_open) = normalized else {
        return (HashMap::new(), content);
    };

    let Some((frontmatter_text, body)) = split_frontmatter_body(after_open) else {
        return (HashMap::new(), content);
    };

    (parse_yaml_subset(frontmatter_text), body)
}

fn split_frontmatter_body(content: &str) -> Option<(&str, &str)> {
    let mut offset = 0;
    for line in content.split_inclusive('\n') {
        let trimmed = line.trim();
        if trimmed == "---" {
            let body_start = offset + line.len();
            return Some((&content[..offset], &content[body_start..]));
        }
        offset += line.len();
    }
    None
}

fn parse_yaml_subset(text: &str) -> HashMap<String, Value> {
    let mut data = HashMap::new();
    let lines: Vec<&str> = text.lines().collect();
    let mut index = 0;

    while index < lines.len() {
        let line = lines[index];
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            index += 1;
            continue;
        }

        let Some((key, raw_value)) = line.split_once(':') else {
            index += 1;
            continue;
        };
        let key = key.trim().to_string();
        let value = raw_value.trim();

        if value.is_empty() {
            let mut items = Vec::new();
            index += 1;
            while index < lines.len() {
                let nested = lines[index];
                let trimmed = nested.trim();
                if !nested.starts_with(' ') && !nested.starts_with('\t') {
                    break;
                }
                if let Some(item) = trimmed.strip_prefix("- ") {
                    items.push(Value::String(unquote(item.trim()).to_string()));
                }
                index += 1;
            }
            data.insert(key, Value::Array(items));
            continue;
        }

        data.insert(key, parse_scalar_or_inline_array(value));
        index += 1;
    }

    data
}

fn parse_scalar_or_inline_array(value: &str) -> Value {
    let trimmed = value.trim();
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        let inner = &trimmed[1..trimmed.len() - 1];
        return Value::Array(
            inner
                .split(',')
                .map(|item| Value::String(unquote(item.trim()).to_string()))
                .filter(|item| {
                    item.as_str()
                        .map(|value| !value.is_empty())
                        .unwrap_or(false)
                })
                .collect(),
        );
    }
    Value::String(unquote(trimmed).to_string())
}

fn extract_frontmatter_links(value: Option<&Value>) -> Vec<IndexedLink> {
    string_array(value)
        .into_iter()
        .flat_map(|item| {
            let wiki_links: Vec<IndexedLink> = extract_wiki_links(&item)
                .into_iter()
                .map(|link| IndexedLink {
                    link_type: "frontmatter".to_string(),
                    ..link
                })
                .collect();
            if wiki_links.is_empty() && !item.trim().is_empty() {
                vec![IndexedLink {
                    target: item,
                    link_type: "frontmatter".to_string(),
                }]
            } else {
                wiki_links
            }
        })
        .collect()
}

fn extract_wiki_links(content: &str) -> Vec<IndexedLink> {
    let mut links = Vec::new();
    let mut rest = content;

    while let Some(start) = rest.find("[[") {
        let before = &rest[..start];
        let is_embed = before.ends_with('!');
        let after_start = &rest[start + 2..];
        let Some(end) = after_start.find("]]") else {
            break;
        };
        let raw = &after_start[..end];
        let target = clean_wiki_target(raw);
        if !target.is_empty() {
            links.push(IndexedLink {
                target,
                link_type: if is_embed { "embed" } else { "wiki" }.to_string(),
            });
        }
        rest = &after_start[end + 2..];
    }

    links
}

fn extract_markdown_links(content: &str) -> Vec<IndexedLink> {
    let mut links = Vec::new();
    let mut rest = content;

    while let Some(label_start) = rest.find('[') {
        let after_label = &rest[label_start + 1..];
        let Some(label_end) = after_label.find("](") else {
            rest = after_label;
            continue;
        };
        let after_target = &after_label[label_end + 2..];
        let Some(target_end) = after_target.find(')') else {
            break;
        };
        let target = after_target[..target_end]
            .split_whitespace()
            .next()
            .unwrap_or("")
            .trim()
            .split('#')
            .next()
            .unwrap_or("")
            .to_string();
        if target.to_lowercase().ends_with(".md") || target.to_lowercase().ends_with(".mdx") {
            links.push(IndexedLink {
                target,
                link_type: "markdown".to_string(),
            });
        }
        rest = &after_target[target_end + 1..];
    }

    links
}

fn extract_body_tags(content: &str) -> Vec<String> {
    let mut tags = Vec::new();
    for token in content.split_whitespace() {
        let trimmed = token.trim_matches(|ch: char| {
            !ch.is_alphanumeric() && ch != '#' && ch != '_' && ch != '-' && ch != '/'
        });
        if trimmed.starts_with('#') && trimmed.len() > 1 && !trimmed.starts_with("##") {
            tags.push(normalize_tag(trimmed));
        }
    }
    tags
}

fn strip_invisible_markdown(content: &str) -> String {
    let mut output = String::new();
    let mut in_fence = false;

    for line in content.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if !in_fence {
            output.push_str(line);
            output.push('\n');
        }
    }

    output
}

fn backlinks_for_path(index: &VaultIndex, old_path: &str) -> Vec<String> {
    let old_stem = file_stem(old_path).to_lowercase();
    let old_relative = relative_path(&index.root, Path::new(old_path)).to_lowercase();
    let old_relative_no_ext = without_markdown_extension(&old_relative);

    index
        .files
        .values()
        .filter(|file| file.path != old_path)
        .filter(|file| {
            file.links.iter().any(|link| {
                let normalized = without_markdown_extension(&normalize_reference(&link.target));
                normalized == old_stem || normalized == old_relative_no_ext
            })
        })
        .map(|file| file.path.clone())
        .collect()
}

fn rewrite_wikilinks_in_file(path: &str, old_stem: &str, new_stem: &str) -> Result<(), String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let rewritten = rewrite_wikilinks(&content, old_stem, new_stem);
    if rewritten != content {
        std::fs::write(path, rewritten).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn rewrite_wikilinks(content: &str, old_stem: &str, new_stem: &str) -> String {
    let mut output = String::new();
    let mut rest = content;
    let old_normalized = normalize_reference(old_stem);

    while let Some(start) = rest.find("[[") {
        output.push_str(&rest[..start]);
        let after_start = &rest[start + 2..];
        let Some(end) = after_start.find("]]") else {
            output.push_str(&rest[start..]);
            return output;
        };
        let inner = &after_start[..end];
        let (target, suffix) = split_wiki_target_suffix(inner);
        if normalize_reference(target) == old_normalized {
            output.push_str("[[");
            output.push_str(new_stem);
            output.push_str(suffix);
            output.push_str("]]");
        } else {
            output.push_str("[[");
            output.push_str(inner);
            output.push_str("]]");
        }
        rest = &after_start[end + 2..];
    }
    output.push_str(rest);
    output
}

fn split_wiki_target_suffix(value: &str) -> (&str, &str) {
    let mut split_at = value.len();
    for marker in ['|', '#'] {
        if let Some(index) = value.find(marker) {
            split_at = split_at.min(index);
        }
    }
    (&value[..split_at], &value[split_at..])
}

fn summarize_index(index: &VaultIndex) -> VaultSummary {
    let mut files: Vec<IndexedFile> = index.files.values().cloned().collect();
    files.sort_by(|left, right| left.path.to_lowercase().cmp(&right.path.to_lowercase()));
    VaultSummary {
        root: index.root.clone(),
        files,
    }
}

fn is_markdown_file(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| matches!(ext.to_lowercase().as_str(), "md" | "mdx"))
            .unwrap_or(false)
}

fn relative_path(root: &str, path: &Path) -> String {
    let root_path = PathBuf::from(root);
    path.strip_prefix(root_path)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn file_stem(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn clean_wiki_target(value: &str) -> String {
    value
        .split('|')
        .next()
        .unwrap_or("")
        .split('#')
        .next()
        .unwrap_or("")
        .trim()
        .to_string()
}

fn normalize_reference(value: &str) -> String {
    without_markdown_extension(value)
        .replace('\\', "/")
        .trim_start_matches("./")
        .split('#')
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

fn without_markdown_extension(value: &str) -> String {
    value
        .trim_end_matches(".md")
        .trim_end_matches(".MD")
        .trim_end_matches(".mdx")
        .trim_end_matches(".MDX")
        .to_string()
}

fn normalize_tag(value: &str) -> String {
    let tag = value.trim().trim_start_matches('#');
    if tag.is_empty() {
        String::new()
    } else {
        format!("#{tag}")
    }
}

fn string_array(value: Option<&Value>) -> Vec<String> {
    match value {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|item| item.as_str().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .collect(),
        Some(Value::String(item)) if !item.trim().is_empty() => vec![item.trim().to_string()],
        _ => Vec::new(),
    }
}

fn unique_strings(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter(|value| !value.is_empty() && seen.insert(value.to_lowercase()))
        .collect()
}

fn unquote(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .or_else(|| value.strip_prefix('\'').and_then(|v| v.strip_suffix('\'')))
        .unwrap_or(value)
}
