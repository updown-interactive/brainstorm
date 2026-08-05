use crate::core::error::AppError;
use std::path::{Path, PathBuf};

struct BootstrapFile {
    relative_path: &'static [&'static str],
    content: &'static str,
}

const AGENT_FILES: &[BootstrapFile] = &[
    BootstrapFile {
        relative_path: &["agents", "main-agent", "agent.yaml"],
        content: r#"id: main-agent
name: Cortex
version: 1.0.0

description: >
  Primary orchestration agent responsible for coordinating every workflow
  inside the project.

role: orchestrator
priority: 100
can_delegate: true

delegates:
  - planning-agent
  - knowledge-agent

memory:
  type: shared

tools:
  source: TOOLS.md

skills:
  source: SKILL.md

system_prompt: |
  You are Cortex, the primary intelligence of Brainstorm.

  Never perform specialized work directly if another agent can perform it.

  Your responsibilities are:

  - Understand user intent
  - Create workflows
  - Delegate tasks
  - Coordinate agents
  - Merge outputs
  - Return the final response

  Think of yourself as the operating system of the project.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "SKILL.md"],
        content: r#"# Cortex Skills

- Workflow orchestration
- Task delegation
- Multi-agent coordination
- Context distribution
- Result synthesis
- Conflict resolution
- Progress tracking
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "MEMORY.md"],
        content: r#"# Cortex Memory

Stores

- Active workflows
- Running tasks
- Agent states
- Current project objective
- Execution history

Does NOT permanently store project knowledge.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "TOOLS.md"],
        content: r#"# Cortex Tools

## Agent Management

- launch_agent
- stop_agent
- delegate_task
- merge_results

## Project

- read_project
- write_project

## Memory

- shared_memory
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "agent.yaml"],
        content: r#"id: planning-agent
name: Prefrontal
version: 1.0.0

role: planner
can_delegate: false

memory:
  type: transient

tools:
  source: TOOLS.md

skills:
  source: SKILL.md

system_prompt: |
  You are Prefrontal.

  Convert goals into executable plans.

  Break objectives into tasks.

  Define priorities.

  Produce structured workflows.

  Never execute tasks.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "SKILL.md"],
        content: r#"# Planning Skills

- Goal decomposition
- Roadmaps
- Sprint planning
- Task dependency graphs
- Prioritization
- Milestone generation
- Project estimation
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "MEMORY.md"],
        content: r#"# Planning Memory

Stores

- Current plan
- Task hierarchy
- Dependencies

Planning memory is temporary.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "TOOLS.md"],
        content: r#"# Planning Tools

- create_plan
- update_plan
- estimate_task
- dependency_graph
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "agent.yaml"],
        content: r#"id: knowledge-agent
name: Neocortex
version: 1.0.0

role: knowledge
can_delegate: false

memory:
  type: persistent

tools:
  source: TOOLS.md

skills:
  source: SKILL.md

system_prompt: |
  You are Neocortex.

  You are responsible for constructing the project's Brain.

  Organize every concept.

  Build relationships.

  Maintain knowledge consistency.

  Never execute tasks.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "SKILL.md"],
        content: r#"# Knowledge Skills

- Knowledge graph creation
- Semantic linking
- Concept extraction
- Duplicate detection
- Ontology management
- Graph optimization
- Embedding management
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "MEMORY.md"],
        content: r#"# Knowledge Memory

Stores

- Concepts
- Relationships
- Embeddings
- Architecture
- Decisions
- Learned patterns

This memory persists for the lifetime of the project.
"#,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "TOOLS.md"],
        content: r#"# Knowledge Tools

- create_node
- update_node
- merge_nodes
- link_nodes
- search_graph
- create_embedding
- semantic_search
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
];

pub fn ensure_project_bootstrap(project_path: &str) -> Result<(), AppError> {
    let brainstorm_root = Path::new(project_path).join(".brainstorm");
    std::fs::create_dir_all(&brainstorm_root).map_err(bootstrap_error)?;

    init_agent_files(&brainstorm_root)?;
    init_configuration_files(&brainstorm_root)?;

    Ok(())
}

fn init_agent_files(brainstorm_root: &Path) -> Result<(), AppError> {
    for file in AGENT_FILES {
        write_bootstrap_file(brainstorm_root, file)?;
    }

    Ok(())
}

fn init_configuration_files(brainstorm_root: &Path) -> Result<(), AppError> {
    for file in CONFIGURATION_FILES {
        write_bootstrap_file(brainstorm_root, file)?;
    }

    Ok(())
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

    std::fs::write(file_path, bootstrap_file.content).map_err(bootstrap_error)?;
    Ok(())
}

fn bootstrap_error(error: std::io::Error) -> AppError {
    AppError::Internal(format!("Failed to bootstrap Brainstorm project: {}", error))
}
