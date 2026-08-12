use crate::core::error::AppError;
use std::path::{Path, PathBuf};

struct BootstrapFile {
    relative_path: &'static [&'static str],
    content: &'static str,
}

const TOOL_FILES: &[BootstrapFile] = &[
    // --- vault ---
    BootstrapFile {
        relative_path: &["tools", "vault", "tool.yaml"],
        content: r#"id: vault
name: Vault
description: Manage the structure and contents of the Brainstorm vault.
version: 0.1.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - vault.execute
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "vault", "manifest.yaml"],
        content: r#"# Project-owned Vault tool configuration.
name: vault
version: 0.1.0
description: Manage the Brainstorm vault structure
runtime: native

permissions:
  vault_read: true
  vault_write: false

tools:
  - name: vault.list
    enabled: true
    description: List files and folders in the vault
  - name: vault.tree
    enabled: true
    description: Get the directory structure of the vault
  - name: vault.exists
    enabled: true
    description: Check whether a path exists in the vault
  - name: vault.info
    enabled: true
    description: Get metadata about a vault file or directory
  - name: vault.create_file
    enabled: true
    description: Create a file in the vault
  - name: vault.create_folder
    enabled: true
    description: Create a folder in the vault
  - name: vault.move
    enabled: true
    description: Move a file or folder within the vault
  - name: vault.rename
    enabled: true
    description: Rename a file or folder within the vault
  - name: vault.delete
    enabled: true
    description: Delete a file or folder from the vault
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "vault", "README.md"],
        content: r#"# Vault Tool

The Vault tool owns vault structure: relative paths, files, folders,
directory listings, metadata, and permission-controlled file operations.
Document semantics remain in the Markdown tool.

All paths are relative to the active project root. The native Vault Service
rejects traversal, absolute paths, invalid separators, and symlink escapes.
Read operations are enabled by default. Write operations require both
`vault_write: true` in `manifest.yaml` and the native runtime permission.
Directory deletion additionally requires `recursive: true`.
"#,
    },
    // --- search ---
    BootstrapFile {
        relative_path: &["tools", "search", "tool.yaml"],
        content: r#"id: search
name: Search
description: Search the Brainstorm vault for relevant documents and content
version: 0.1.0
permissions:
  - vault.read
functions:
  - search.query
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "search", "manifest.yaml"],
        content: r#"# Project-owned Search tool configuration.
name: search
version: 0.1.0
description: Search the Brainstorm vault for relevant documents and content
runtime: native

permissions:
  vault_read: true

tools:
  - name: search.query
    enabled: true
    description: Search the Brainstorm vault for relevant documents and content
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "search", "README.md"],
        content: r#"# Search Tool

Search discovers relevant Markdown documents in the active vault. It uses a
local derived index and returns ranked paths and concise snippets.

The index is rebuilt when needed and updated from the existing file watcher.
Search is read-only; use the Vault and Markdown tools for file operations and
document inspection.
"#,
    },
    // --- markdown ---
    BootstrapFile {
        relative_path: &["tools", "markdown", "tool.yaml"],
        content: r#"id: markdown
name: Markdown
display_name: Markdown Tool
version: 0.1.0
description: Read Brainstorm Markdown documents and return structured content.
category: document
enabled: true
capabilities:
  - markdown.read
  - markdown.metadata
  - markdown.links
  - markdown.headings
permissions:
  - workspace.read
operations:
  - read
  - metadata
  - links
  - headings
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "README.md"],
        content: r#"# Markdown Tool (`tools/markdown`)

The **Markdown Tool** is a standalone runtime capability for reading and analyzing Brainstorm Markdown documents.

## Architecture

```text
Application
  ↓ requests operation
Markdown Tool (.brainstorm/tools/markdown/)
  ↓ validates permissions & workspace boundaries
Parser & Frontmatter Property Engine
  ↓ parses a read-only document request
Workspace Files (.md / .mdx)
```

## Model Architecture

Every Brainstorm Markdown document consists of two distinct components:
1. **YAML Frontmatter**: Metadata bounded between top-level `---` fences at position 0.
2. **Markdown Body**: Rich body content containing headings, paragraphs, lists, task lists, code blocks, math, callouts, and wiki links.

## Core Features
- **Structured Reads**: Returns typed frontmatter, body content, headings, wiki links, Markdown links, and tags.
- **Workspace Boundary Safety**: Enforces strict workspace path validation, blocking traversal escapes (`../`, absolute paths, symlinks).
- **AST Structural Extraction**: Parses headings, sections, wiki links (`[[Target]]`), tags (`#tag`), task lists (`- [x]`), callouts (`> [!NOTE]`), math (`$E=mc^2$`), tables, and code blocks (`mermaid`, `rust`, etc.).

Only `markdown.read`, `markdown.metadata`, `markdown.links`, and `markdown.headings` are enabled in this version. Write operations are intentionally not available.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "manifest.yaml"],
        content: r#"# Project-owned Markdown tool configuration.
name: markdown
version: 0.1.0
description: Read and understand Brainstorm Markdown knowledge documents
runtime: native

permissions:
  vault_read: true
  vault_write: false

tools:
  - name: markdown.read
    enabled: true
    description: Read a Markdown document and return its structured representation
  - name: markdown.metadata
    enabled: true
    description: Extract document metadata and YAML frontmatter
  - name: markdown.links
    enabled: true
    description: Extract wiki links and Markdown links from a document
  - name: markdown.headings
    enabled: true
    description: Extract the heading structure of a Markdown document
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "SKILLS.md"],
        content: r#"# SKILLS

## Markdown Parsing
Parses Markdown body and frontmatter into structured AST and metadata maps.

## Frontmatter Management
Reads, validates, adds, updates, renames, and removes YAML frontmatter properties with type inference.

## Section Management
Reads, appends, prepends, replaces, and deletes document sections by heading level.

## Wiki Links & Embedding
Extracts, normalizes, and resolves Brainstorm wiki links (`[[Target|Alias#Heading]]`) and embedded notes (`![[Note]]`).

## Tag Processing
Extracts and normalizes tags from frontmatter lists and inline body `#tag` occurrences.

## Property Model Validation
Validates lifecycle, classification, knowledge, descriptive, UI, and custom properties against Brainstorm schemas.

## Structural Analysis
Extracts task list states, code blocks, tables, math formulas, mermaid diagrams, and callout blocks.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "RULES.md"],
        content: r#"# RULES

1. **Standalone Runtime**: The Markdown tool is strictly standalone and does not hardcode caller-specific execution checks.
2. **Formatting Preservation**: Perform targeted edits. Never reformat unrelated YAML frontmatter or Markdown body content unnecessarily.
3. **Top-level Frontmatter Fence**: Recognize frontmatter `---` fences ONLY when starting at index 0 of the document. Ignore horizontal rules or body `---` blocks.
4. **Bidirectional Name Sync**: Renaming `name` property renames the file on disk. Renaming the file updates `name` property. Avoid recursive loop triggers.
5. **Path Boundary Enforcement**: Enforce workspace boundary checks. Reject `../`, absolute path escapes, and unverified symlinks.
6. **Schema Validation**: Validate built-in enum values (`type`, `domain`, `status`), date formats (`YYYY-MM-DD`), and boolean types. Return structured errors and warnings.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "SCHEMAS.md"],
        content: r#"# SCHEMAS

## Supported Operations

### `read`
Input: `{ path: string }`
Output: `{ path: string, content: string, frontmatter: object, body: string, metadata: object }`

### `create`
Input: `{ path: string, properties: object, content: string }`
Output: `{ success: boolean, path: string, document: object }`

### `update`
Input: `{ path: string, properties?: object, body?: string }`
Output: `{ success: boolean, path: string, updated_properties: string[] }`

### `append` / `prepend`
Input: `{ path: string, content: string }`
Output: `{ success: boolean, path: string }`

### `replace`
Input: `{ path: string, section?: string, content: string }`
Output: `{ success: boolean, path: string }`

### `parse` / `validate` / `properties` / `sections` / `links` / `tags` / `headings` / `extract`
Input: `{ path: string, operation: string, options?: object }`
Output: Structured payload matching operation results.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "EXAMPLES.md"],
        content: r##"# EXAMPLES & TEST FIXTURES

## Primary Test Fixture (`Homes.md`)

```markdown
---
name: Homes
created: 2026-07-22
updated: 2026-08-07
type: documentation
domain: personal
status: active
tags:
  - "#herbivores"
aliases:
  - house
  - building
links:
  - "[[Test]]"
summary: This section holds the summary
icon: rocket
favorite: true
priority: 2
author: Siva
description: This is the description
published: 2026-08-08
contributors:
  - siva
---

# Markdown Preview Test

Welcome to the comprehensive Markdown preview test document.

> [!NOTE]
> Callout note block for important information.

## Text Formatting

*Italic text*, **Bold text**, ***Bold Italic***, ~Strikethrough~, and `Inline Code`.

## Lists

### Unordered
- Item 1
- Item 2
  - Subitem 2.1

### Task List
- [x] Completed task
- [ ] Pending task

## Code Blocks

```rust
fn main() {
    println!("Hello Brainstorm!");
}
```

```mermaid
graph TD
  A[Start] --> B(Process)
  B --> C{Decision}
```

## Math

Inline math: $E = mc^2$

Display math:
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## Wiki Links & Tags

See [[Project Roadmap|Roadmap]] and #markdown #testing.
```
"##,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "enum": [
        "read", "create", "update", "append", "prepend", "replace",
        "parse", "validate", "properties", "sections", "links",
        "tags", "headings", "extract"
      ]
    },
    "path": { "type": "string" },
    "content": { "type": "string" },
    "properties": { "type": "object" },
    "section": { "type": "string" }
  },
  "required": ["operation", "path"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "markdown", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "operation": { "type": "string" },
    "path": { "type": "string" },
    "document": { "type": "object" },
    "frontmatter": { "type": "object" },
    "body": { "type": "string" },
    "metadata": { "type": "object" },
    "errors": { "type": "array" },
    "warnings": { "type": "array" }
  },
  "required": ["success", "operation"]
}
"#,
    },
    // --- web ---
    BootstrapFile {
        relative_path: &["tools", "web", "tool.yaml"],
        content: r#"id: web
name: Web
description: Fetch public web pages and extract readable online content.
version: 1.0.0
permissions:
  - network
functions:
  - web.fetch
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "web", "manifest.yaml"],
        content: r#"# Project-owned web tool configuration.
name: web
version: 0.1.0
description: Access and retrieve information from the public web
runtime: native

permissions:
  network: true

limits:
  timeout_seconds: 20
  max_response_size: 10485760
  max_extracted_text_size: 524288
  max_redirects: 5

client:
  user_agent: "Brainstorm/0.1 web.fetch"
  follow_redirects: true

extraction:
  content_selector: "body :not(script):not(style):not(noscript):not(nav)"

tools:
  - name: web.fetch
    enabled: true
    description: Fetch a public web page and return readable content
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "web", "README.md"],
        content: r#"# Web Tool

The native Web runtime is project-independent Rust code. This package is the
project-owned configuration that controls how that runtime behaves.

## Configuration

Edit `manifest.yaml` to enable or disable operations and tune timeouts,
response limits, redirect behavior, user-agent, and readable-content selection.
Changes are read when an operation runs, so the runtime does not need to be
rebuilt when a project owner changes these settings.

`permissions.network` must be enabled here and by the invoking application
runtime. The runtime always enforces HTTP/HTTPS-only URLs and blocks local,
private, loopback, and link-local addresses; project configuration cannot
weaken those protections.

## Runtime flow

`web.fetch` → project manifest → permission check → URL/SSRF validation →
bounded async HTTP request → content-type check → HTML/plain-text extraction →
structured result.

Only `web.fetch` is implemented in this version. Future operations such as
`web.search` can be added as new `[[tools]]` entries and native handlers.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "web", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "url": { "type": "string" },
    "project_path": { "type": "string" }
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "web", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "url": { "type": "string" },
    "status": { "type": "integer" },
    "content_type": { "type": "string" },
    "title": { "type": ["string", "null"] },
    "content": { "type": "string" }
  }
}
"#,
    },
];

const CONFIGURATION_FILES: &[BootstrapFile] = &[
    BootstrapFile {
        relative_path: &["configuration", "explorer-config.json"],
        content: r#"{
  "position": "left",
  "sidebarWidth": 260
}
"#,
    },
    BootstrapFile {
        relative_path: &["configuration", "graph-config.json"],
        content: r#"{
  "forceModelVersion": 2,
  "display": {
    "arrows": false,
    "textFadeThreshold": 0.5,
    "nodeSize": 1,
    "linkThickness": 1
  },
  "forces": {
    "center": 50,
    "repel": 50,
    "link": 50,
    "linkDistance": 50
  },
  "panel": {
    "open": true,
    "displayOpen": true,
    "forcesOpen": true
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["configuration", "property-config.json"],
        content: r#"{
  "tags": []
}
"#,
    },
    BootstrapFile {
        relative_path: &["configuration", "editor-config.json"],
        content: r#"{
  "propertiesDisplayMode": "expanded"
}
"#,
    },
];

const STATE_FILES: &[BootstrapFile] = &[BootstrapFile {
    relative_path: &["state", "explorer-state.json"],
    content: r#"{
  "version": 1,
  "fileTree": {
    "expandedPaths": [],
    "focusedPath": null
  },
  "editor": {
    "activePaneId": "pane-1",
    "panes": [
      {
        "id": "pane-1",
        "activeTabId": null,
        "tabs": []
      }
    ]
  }
}
"#,
}];

pub struct BootstrapEngine<'a> {
    brainstorm_root: PathBuf,
    _project_path: &'a Path,
}

impl<'a> BootstrapEngine<'a> {
    pub fn new(project_path: &'a str) -> Self {
        let path = Path::new(project_path);
        let brainstorm_root = path.join(".brainstorm");
        Self {
            brainstorm_root,
            _project_path: path,
        }
    }

    pub fn run(&self) -> Result<(), AppError> {
        // Stage 1 — Create .brainstorm
        self.stage_1_create_workspace_root()?;

        // Stage 2 — Prepare configuration
        self.stage_2_prepare_configuration()?;

        // Stage 3 — Install Core Tools
        self.stage_3_remove_legacy_workspace_data()?;
        self.stage_3_b_install_tool_packages()?;

        // Stage 4 — Create Workspace Metadata
        let workspace_id = self.stage_4_create_workspace_metadata()?;

        // Stage 6 — Build Tool Registries
        self.stage_6_build_capability_registry()?;
        self.stage_6_b_build_tool_registry()?;

        // Stage 7 — Validate & Generate bootstrap.yaml
        self.stage_10_validate_and_finalize(&workspace_id)?;

        // Install UI Configuration files
        self.install_configuration_files()?;

        Ok(())
    }

    fn stage_1_create_workspace_root(&self) -> Result<(), AppError> {
        std::fs::create_dir_all(&self.brainstorm_root).map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_2_prepare_configuration(&self) -> Result<(), AppError> {
        let configuration_dir = self.brainstorm_root.join("configuration");
        let state_dir = self.brainstorm_root.join("state");
        let legacy_explorer_state = self.brainstorm_root.join("explorer-state.json");

        // Clean up legacy `config` directory to avoid confusion with `configuration`
        let legacy_config_dir = self.brainstorm_root.join("config");
        if legacy_config_dir.exists() {
            let _ = std::fs::remove_dir_all(legacy_config_dir);
        }
        if legacy_explorer_state.exists() {
            let _ = std::fs::remove_file(legacy_explorer_state);
        }

        std::fs::create_dir_all(&configuration_dir).map_err(bootstrap_error)?;
        std::fs::create_dir_all(&state_dir).map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_3_remove_legacy_workspace_data(&self) -> Result<(), AppError> {
        let agents_dir = self.brainstorm_root.join("agents");
        if agents_dir.exists() {
            std::fs::remove_dir_all(agents_dir).map_err(bootstrap_error)?;
        }
        Ok(())
    }

    fn stage_3_b_install_tool_packages(&self) -> Result<(), AppError> {
        for file in TOOL_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        Ok(())
    }

    fn stage_4_create_workspace_metadata(&self) -> Result<String, AppError> {
        let workspace_id = format!("ws_{}", &uuid::Uuid::new_v4().to_string()[..8]);
        Ok(workspace_id)
    }

    fn stage_6_build_capability_registry(&self) -> Result<(), AppError> {
        let registry_file = self
            .brainstorm_root
            .join("configuration")
            .join("capability-registry.json");
        if let Some(parent) = registry_file.parent() {
            std::fs::create_dir_all(parent).map_err(bootstrap_error)?;
        }
        std::fs::write(
            registry_file,
            "{\n  \"capabilities\": {},\n  \"aliases\": {}\n}\n",
        )
        .map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_6_b_build_tool_registry(&self) -> Result<(), AppError> {
        let registry_file = self
            .brainstorm_root
            .join("configuration")
            .join("tool-registry.json");
        let tools_dir = self.brainstorm_root.join("tools");
        let mut installed_tools: std::collections::BTreeMap<String, serde_json::Value> =
            std::collections::BTreeMap::new();

        if tools_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&tools_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let manifest_path = entry.path().join("tool.yaml");
                        if manifest_path.exists() {
                            if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                                let tool_id =
                                    parse_yaml_scalar(&content, "id").unwrap_or_else(|| {
                                        entry.file_name().to_string_lossy().to_string()
                                    });
                                let tool_name = parse_yaml_scalar(&content, "name")
                                    .unwrap_or_else(|| tool_id.clone());
                                let tool_desc =
                                    parse_yaml_scalar(&content, "description").unwrap_or_default();
                                let tool_ver = parse_yaml_scalar(&content, "version")
                                    .unwrap_or_else(|| "1.0.0".to_string());
                                let permissions = parse_yaml_list(&content, "permissions");
                                let functions = parse_yaml_list(&content, "functions");

                                let mut tool_obj = serde_json::Map::new();
                                tool_obj.insert(
                                    "id".to_string(),
                                    serde_json::Value::String(tool_id.clone()),
                                );
                                tool_obj.insert(
                                    "name".to_string(),
                                    serde_json::Value::String(tool_name),
                                );
                                tool_obj.insert(
                                    "description".to_string(),
                                    serde_json::Value::String(tool_desc),
                                );
                                tool_obj.insert(
                                    "version".to_string(),
                                    serde_json::Value::String(tool_ver),
                                );
                                tool_obj.insert(
                                    "permissions".to_string(),
                                    serde_json::Value::Array(
                                        permissions
                                            .into_iter()
                                            .map(serde_json::Value::String)
                                            .collect(),
                                    ),
                                );
                                tool_obj.insert(
                                    "functions".to_string(),
                                    serde_json::Value::Array(
                                        functions
                                            .into_iter()
                                            .map(serde_json::Value::String)
                                            .collect(),
                                    ),
                                );

                                installed_tools
                                    .insert(tool_id, serde_json::Value::Object(tool_obj));
                            }
                        }
                    }
                }
            }
        }

        let mut root_obj = serde_json::Map::new();
        let mut tools_val = serde_json::Map::new();
        for (id, val) in installed_tools {
            tools_val.insert(id, val);
        }
        root_obj.insert(
            "installed_tools".to_string(),
            serde_json::Value::Object(tools_val),
        );

        let json_str = serde_json::to_string_pretty(&serde_json::Value::Object(root_obj))
            .map_err(|e| AppError::Internal(format!("Failed to serialize tool registry: {}", e)))?;

        if let Some(parent) = registry_file.parent() {
            std::fs::create_dir_all(parent).map_err(bootstrap_error)?;
        }
        std::fs::write(registry_file, json_str).map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_10_validate_and_finalize(&self, workspace_id: &str) -> Result<(), AppError> {
        let bootstrap_manifest_file = self.brainstorm_root.join("bootstrap.yaml");
        if !bootstrap_manifest_file.exists() {
            let now_secs = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let manifest_content = format!(
                r#"workspace_id: {}
bootstrap_version: 1.0.0
brainstorm_version: 0.1.0
completed_at: {}
installed:
  tools: true
  settings: true
schema_version: 1
"#,
                workspace_id, now_secs
            );

            std::fs::write(bootstrap_manifest_file, manifest_content).map_err(bootstrap_error)?;
        }

        Ok(())
    }

    fn install_configuration_files(&self) -> Result<(), AppError> {
        for file in CONFIGURATION_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        for file in STATE_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        Ok(())
    }
}

pub fn ensure_project_bootstrap(project_path: &str) -> Result<(), AppError> {
    let engine = BootstrapEngine::new(project_path);
    engine.run()
}

fn ensure_brainstorm_markdown_frontmatter(file_path: &Path, content: &str) -> String {
    let name = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled");

    let today = "2026-08-08";

    if content.starts_with("---") {
        let first_line_end = content.find('\n').unwrap_or(0);
        if let Some(fence_end) = content[first_line_end + 1..].find("\n---") {
            let actual_fence_end = first_line_end + 1 + fence_end;
            let yaml_block = &content[first_line_end + 1..actual_fence_end];

            let has_author = yaml_block.lines().any(|l| l.trim().starts_with("author:"));
            let has_name = yaml_block.lines().any(|l| l.trim().starts_with("name:"));

            if has_author && has_name {
                return content.to_string();
            }

            let mut new_yaml = String::new();
            if !has_name {
                new_yaml.push_str(&format!("name: {}\n", name));
            }
            if !has_author {
                new_yaml.push_str("author: BrainStorm\n");
            }
            new_yaml.push_str(yaml_block);

            let body = &content[actual_fence_end + 4..];
            return format!(
                "---\n{}{}---\n{}",
                new_yaml,
                if new_yaml.ends_with('\n') { "" } else { "\n" },
                body
            );
        }
    }

    format!(
        "---\nname: {}\nauthor: BrainStorm\ncreated: {}\nupdated: {}\n---\n\n{}",
        name, today, today, content
    )
}

fn write_bootstrap_file(
    brainstorm_root: &Path,
    bootstrap_file: &BootstrapFile,
) -> Result<(), AppError> {
    let file_path = bootstrap_file
        .relative_path
        .iter()
        .fold(PathBuf::from(brainstorm_root), |path, segment| {
            path.join(segment)
        });

    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(bootstrap_error)?;
    }

    if file_path.exists() {
        return Ok(());
    }

    let mut content = bootstrap_file.content.to_string();
    if file_path.extension().and_then(|ext| ext.to_str()) == Some("md") {
        content = ensure_brainstorm_markdown_frontmatter(&file_path, &content);
    }

    std::fs::write(file_path, content).map_err(bootstrap_error)?;
    Ok(())
}

fn parse_yaml_scalar(content: &str, key: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(&format!("{}:", key)) {
            let parts: Vec<&str> = trimmed.splitn(2, ':').collect();
            if parts.len() == 2 {
                let val = parts[1].trim().trim_matches(|c| c == '"' || c == '\'');
                if !val.is_empty() {
                    return Some(val.to_string());
                }
            }
        }
    }
    None
}

fn parse_yaml_list(content: &str, key: &str) -> Vec<String> {
    let lines: Vec<&str> = content.lines().collect();
    let mut items = Vec::new();
    let mut in_list = false;

    for line in lines {
        let trimmed = line.trim();
        if trimmed == format!("{}:", key) {
            in_list = true;
            continue;
        }
        if in_list {
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if trimmed.starts_with("- ") {
                let item = trimmed[2..].trim().trim_matches(|c| c == '"' || c == '\'');
                items.push(item.to_string());
            } else if !line.starts_with(' ') && !line.starts_with('\t') {
                break;
            }
        }
    }
    items
}

fn bootstrap_error(error: std::io::Error) -> AppError {
    AppError::Internal(format!("Failed to bootstrap Brainstorm project: {}", error))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bootstrap_core_tools_without_agents() {
        let temp_dir =
            std::env::temp_dir().join(format!("brainstorm_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();

        let engine = BootstrapEngine::new(temp_dir.to_str().unwrap());
        engine.run().unwrap();

        let brainstorm_root = temp_dir.join(".brainstorm");
        assert!(brainstorm_root.exists());

        assert!(!brainstorm_root.join("agents").exists());

        // Verify standalone tools installation
        let tools_dir = brainstorm_root.join("tools");
        assert!(tools_dir.exists());
        for tool in &["vault", "markdown", "search", "web"] {
            let tool_dir = tools_dir.join(tool);
            assert!(tool_dir.exists(), "Tool dir {} should exist", tool);
            assert!(tool_dir.join("tool.yaml").exists());
            assert!(tool_dir.join("README.md").exists());
        }

        assert!(tools_dir.join("web").join("manifest.yaml").exists());
        assert!(tools_dir.join("search").join("manifest.yaml").exists());

        // Verify full tools/markdown package file suite
        let markdown_tool_dir = tools_dir.join("markdown");
        assert!(markdown_tool_dir.join("SKILLS.md").exists());
        assert!(markdown_tool_dir.join("RULES.md").exists());
        assert!(markdown_tool_dir.join("SCHEMAS.md").exists());
        assert!(markdown_tool_dir.join("EXAMPLES.md").exists());
        assert!(markdown_tool_dir.join("INPUT_SCHEMA.json").exists());
        assert!(markdown_tool_dir.join("OUTPUT_SCHEMA.json").exists());
        assert!(markdown_tool_dir.join("manifest.yaml").exists());
        let vault_tool_dir = tools_dir.join("vault");
        assert!(vault_tool_dir.join("manifest.yaml").exists());

        let explorer_state_file = brainstorm_root.join("state").join("explorer-state.json");
        assert!(explorer_state_file.exists());
        let explorer_state: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(explorer_state_file).unwrap()).unwrap();
        assert_eq!(
            explorer_state
                .get("version")
                .and_then(|value| value.as_i64()),
            Some(1)
        );

        // Verify capability registry
        let registry_file = brainstorm_root
            .join("configuration")
            .join("capability-registry.json");
        assert!(registry_file.exists());
        let registry_raw = std::fs::read_to_string(registry_file).unwrap();
        let registry_json: serde_json::Value = serde_json::from_str(&registry_raw).unwrap();

        let aliases = registry_json.get("aliases").unwrap();
        assert!(aliases.as_object().unwrap().is_empty());

        // Verify tool registry
        let tool_registry_file = brainstorm_root
            .join("configuration")
            .join("tool-registry.json");
        assert!(tool_registry_file.exists());
        let tool_reg_raw = std::fs::read_to_string(tool_registry_file).unwrap();
        let tool_reg_json: serde_json::Value = serde_json::from_str(&tool_reg_raw).unwrap();

        let installed_tools = tool_reg_json.get("installed_tools").unwrap();
        assert!(installed_tools.get("vault").is_some());
        assert!(installed_tools.get("markdown").is_some());
        assert!(installed_tools.get("search").is_some());
        assert!(installed_tools.get("web").is_some());

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
