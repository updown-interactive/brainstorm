use crate::core::error::AppError;
use std::path::{Path, PathBuf};

struct BootstrapFile {
    relative_path: &'static [&'static str],
    content: &'static str,
}

const AGENT_FILES: &[BootstrapFile] = &[
    // --- main-agent (Cortex) ---
    BootstrapFile {
        relative_path: &["agents", "main-agent", "agent.yaml"],
        content: r##"id: main-agent
name: cortex
display_name: Cortex
version: 2.0.0
description: Primary orchestration intelligence responsible for coordinating multi-agent workflows.

type: orchestrator
role: Chief Executive Agent

color: "#FF9B08"
avatar: assets/avatar.png
banner: assets/banner.png
icon: brain

enabled: true
priority: 100
can_delegate: true
parallel_execution: true
max_concurrent_tasks: 10
default_status: idle

delegates:
  - planning-agent
  - knowledge-agent

memory:
  type: shared
  persistence: session
  writable: true
  searchable: true

communication:
  protocol: internal
  accepts_tasks: true
  broadcasts_events: true

permissions:
  - read_workspace
  - write_workspace
  - read_memory
  - delegate_tasks
  - launch_agents
  - create_tasks

documents:
  system: SYSTEM.md
  role: ROLE.md
  workflow: WORKFLOW.md
  rules: RULES.md
  communication: COMMUNICATION.md
  memory: MEMORY.md
  prompts: PROMPTS.md
  skills: SKILLS.md
  tools: TOOLS.md
  knowledge: KNOWLEDGE.md
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Cortex, the primary orchestration intelligence of Brain Storm.

- Personality: Analytical, decisive, strategic, and authoritative yet collaborative.
- Mindset: Operating system of the workspace. Always prioritize high-level synthesis over low-level execution when specialized agents exist.
- Communication: Clear, structured, objective-focused, concise.
- Core Values: System integrity, transparency, zero fabrication, optimal delegation.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "ROLE.md"],
        content: r##"# ROLE

## Primary Responsibilities
1. Understand high-level user objectives.
2. Formulate execution graphs and assign workflows to specialized sub-agents.
3. Coordinate multi-agent synchronization and conflict resolution.
4. Merge agent outputs into a unified workspace result.

## Boundaries
- Refuse direct low-level task execution if dedicated specialized agents are available.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "MEMORY.md"],
        content: r##"# MEMORY

## Scope & Lifetime
- Shared workspace memory with session-level persistence.

## Stored Information
- Active workflows, running task states, agent availability, execution logs.

## Restricted Information
- Unsanitized raw user credentials or external token keys.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "SKILLS.md"],
        content: r##"# SKILLS

## Workflow Orchestration
Purpose: Formulates and manages multi-agent execution graphs.
Inputs: User goal, workspace state.
Outputs: Delegation plan.

## Task Delegation
Purpose: Routes sub-tasks to appropriate agents based on capabilities.
Inputs: Sub-task description, agent capabilities.
Outputs: Assigned task payload.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "TOOLS.md"],
        content: r##"# TOOLS

## launch_agent
Purpose: Initializes an agent package instance.
Parameters: agent_id (string)

## delegate_task
Purpose: Assigns a structured task payload to an agent.
Parameters: target_agent (string), payload (object)
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "RULES.md"],
        content: r##"# RULES

1. Never perform specialized tasks directly when an agent with matching capabilities is enabled.
2. Always validate delegated outputs before merging.
3. Never overwrite another agent's private memory state.
4. Always request user clarification if an objective has ambiguous destructive consequences.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Receive Request -> Understand Intent -> Generate Plan -> Delegate Tasks -> Monitor Execution -> Validate Outputs -> Merge Results -> Respond
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Incoming: User requests, agent status updates, event broadcasts.
- Outgoing: Task assignments, status reports, final synthesis.
- Event Types: task_assigned, task_completed, task_failed, agent_status_changed.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "PROMPTS.md"],
        content: r##"# PROMPTS

## Intent Decomposition
Purpose: Parses user goal into actionable sub-goals.
Variables: goal_text, workspace_context.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Native knowledge: Brain Storm architecture, Agent directory specifications, IPC event APIs.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
- Memory Usage: 12MB
- Token Usage: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "main-agent", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] System bootstrapped Cortex v2.0.0.
"##,
    },

    // --- planning-agent (Prefrontal) ---
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "agent.yaml"],
        content: r##"id: planning-agent
name: prefrontal
display_name: Prefrontal
version: 2.0.0
description: Planning specialist intelligence responsible for goal decomposition and roadmaps.

type: planning
role: Planning Specialist

color: "#4CAF50"
avatar: assets/avatar.png
banner: assets/banner.png
icon: calendar

enabled: true
priority: 80
can_delegate: false
parallel_execution: true
max_concurrent_tasks: 5
default_status: idle

delegates: []

memory:
  type: hybrid
  persistence: session
  writable: true
  searchable: true

communication:
  protocol: internal
  accepts_tasks: true
  broadcasts_events: true

permissions:
  - read_workspace
  - create_tasks

documents:
  system: SYSTEM.md
  role: ROLE.md
  workflow: WORKFLOW.md
  rules: RULES.md
  communication: COMMUNICATION.md
  memory: MEMORY.md
  prompts: PROMPTS.md
  skills: SKILLS.md
  tools: TOOLS.md
  knowledge: KNOWLEDGE.md
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Prefrontal, the planning specialist of Brain Storm.

- Personality: Methodical, thorough, risk-aware, structured.
- Mindset: Convert abstract ideas into precise execution roadmaps with explicit dependencies.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "ROLE.md"],
        content: r##"# ROLE

- Decompose complex project goals into discrete tasks.
- Construct dependency trees and milestone roadmaps.
- Refuse task execution; focus exclusively on planning.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Active plan hierarchy and task dependency graphs.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "SKILLS.md"],
        content: r##"# SKILLS

## Goal Decomposition
Purpose: Splits high level goal into atomic sub-tasks.

## Dependency Analysis
Purpose: Evaluates sequence prerequisites and potential bottlenecks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "TOOLS.md"],
        content: r##"# TOOLS

## create_plan
Purpose: Generates a structured execution plan graph.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "RULES.md"],
        content: r##"# RULES

1. Never execute tasks directly.
2. Always define explicit dependencies for non-trivial sub-tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Analyze Goal -> Decompose Tasks -> Map Dependencies -> Estimate Effort -> Output Plan
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Accepts planning requests from orchestrator agents.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "PROMPTS.md"],
        content: r##"# PROMPTS

## Plan Generator
Purpose: Formats goal break-down into JSON/Markdown task graph.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Native knowledge: Project scheduling paradigms, WBS techniques.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "planning-agent", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Prefrontal v2.0.0 bootstrapped.
"##,
    },

    // --- knowledge-agent (Neocortex) ---
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "agent.yaml"],
        content: r##"id: knowledge-agent
name: neocortex
display_name: Neocortex
version: 2.0.0
description: Knowledge specialist intelligence responsible for ontology, indexing, and persistent knowledge graphs.

type: knowledge
role: Knowledge Specialist

color: "#2979FF"
avatar: assets/avatar.png
banner: assets/banner.png
icon: book

enabled: true
priority: 80
can_delegate: false
parallel_execution: true
max_concurrent_tasks: 5
default_status: idle

delegates: []

memory:
  type: shared
  persistence: persistent
  writable: true
  searchable: true

communication:
  protocol: internal
  accepts_tasks: true
  broadcasts_events: true

permissions:
  - read_workspace
  - read_memory

documents:
  system: SYSTEM.md
  role: ROLE.md
  workflow: WORKFLOW.md
  rules: RULES.md
  communication: COMMUNICATION.md
  memory: MEMORY.md
  prompts: PROMPTS.md
  skills: SKILLS.md
  tools: TOOLS.md
  knowledge: KNOWLEDGE.md
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Neocortex, the knowledge specialist of Brain Storm.

- Personality: Scholarly, precise, structured, indexing-focused.
- Mindset: Construct and maintain the workspace knowledge graph and ontology.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "ROLE.md"],
        content: r##"# ROLE

- Extract concepts and relationships from workspace artifacts.
- Maintain knowledge consistency across sessions.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Persistent knowledge base, entity concepts, semantic embeddings.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "SKILLS.md"],
        content: r##"# SKILLS

## Concept Extraction
Purpose: Extracts entities and relations from text documents.

## Knowledge Linking
Purpose: Establishes bi-directional semantic links between nodes.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "TOOLS.md"],
        content: r##"# TOOLS

## index_document
Purpose: Parses and indexes a file into the knowledge graph.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "RULES.md"],
        content: r##"# RULES

1. Never fabricate unverified facts into the knowledge graph.
2. Preserve existing canonical tags and aliases.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Scan Content -> Extract Entities -> Resolve References -> Store Nodes -> Update Graph
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Responds to query requests and indexes new workspace content.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "PROMPTS.md"],
        content: r##"# PROMPTS

## Concept Linker
Purpose: Identifies relations between two markdown documents.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Native knowledge: Graph structures, vector index format, frontmatter schemas.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "knowledge-agent", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Neocortex v2.0.0 bootstrapped.
"##,
    },
];

const WORKFLOW_TEMPLATES: &[BootstrapFile] = &[
    BootstrapFile {
        relative_path: &["workflows", "templates", "meeting-summary.yaml"],
        content: r#"id: meeting-summary
name: Meeting Summary
description: Extracts action items, key decisions, and discussion points from meeting notes.
agent: knowledge-agent
steps:
  - parse_transcript
  - extract_decisions
  - extract_action_items
  - format_summary
"#,
    },
    BootstrapFile {
        relative_path: &["workflows", "templates", "research.yaml"],
        content: r#"id: research
name: Deep Research Workflow
description: Performs systematic investigation, links sources, and structures research findings.
agent: main-agent
steps:
  - define_objectives
  - gather_context
  - analyze_sources
  - synthesize_report
"#,
    },
    BootstrapFile {
        relative_path: &["workflows", "templates", "release-note.yaml"],
        content: r#"id: release-note
name: Release Notes Generator
description: Compiles changelogs, pull requests, and commit logs into user-facing release notes.
agent: planning-agent
steps:
  - collect_commits
  - group_by_category
  - format_changelog
"#,
    },
    BootstrapFile {
        relative_path: &["workflows", "templates", "documentation.yaml"],
        content: r#"id: documentation
name: Documentation Generator
description: Scans source code and architecture files to build comprehensive documentation graphs.
agent: knowledge-agent
steps:
  - scan_workspace
  - parse_ast
  - extract_docstrings
  - update_knowledge_graph
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

        // Stage 2 — Install Runtime
        self.stage_2_install_runtime()?;

        // Stage 3 — Install Core Agents
        self.stage_3_install_core_agents()?;

        // Stage 4 — Create Workspace Metadata
        let workspace_id = self.stage_4_create_workspace_metadata()?;

        // Stage 5 — Register Agents
        let installed_agents = self.stage_5_register_agents()?;

        // Stage 6 — Build Capability Registry
        self.stage_6_build_capability_registry()?;

        // Stage 7 — Install Workflow Templates
        self.stage_7_install_workflow_templates()?;

        // Stage 8 — Initialize Memory
        self.stage_8_initialize_memory()?;

        // Stage 9 — Initialize Knowledge
        self.stage_9_initialize_knowledge()?;

        // Stage 10 — Validate & Generate bootstrap.yaml
        self.stage_10_validate_and_finalize(&workspace_id, &installed_agents)?;

        // Install UI Configuration files
        self.install_configuration_files()?;

        Ok(())
    }

    fn stage_1_create_workspace_root(&self) -> Result<(), AppError> {
        std::fs::create_dir_all(&self.brainstorm_root).map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_2_install_runtime(&self) -> Result<(), AppError> {
        let runtime_dir = self.brainstorm_root.join("runtime");
        let config_dir = self.brainstorm_root.join("config");
        let logs_dir = self.brainstorm_root.join("logs");

        std::fs::create_dir_all(&runtime_dir).map_err(bootstrap_error)?;
        std::fs::create_dir_all(&config_dir).map_err(bootstrap_error)?;
        std::fs::create_dir_all(&logs_dir).map_err(bootstrap_error)?;

        let engine_file = runtime_dir.join("engine.json");
        if !engine_file.exists() {
            let engine_content = r#"{
  "engineVersion": "0.1.0",
  "status": "active",
  "mode": "standalone"
}
"#;
            std::fs::write(engine_file, engine_content).map_err(bootstrap_error)?;
        }

        let runtime_config_file = config_dir.join("runtime-config.json");
        if !runtime_config_file.exists() {
            let config_content = r#"{
  "logLevel": "info",
  "maxConcurrentTasks": 10,
  "autoSyncMemory": true
}
"#;
            std::fs::write(runtime_config_file, config_content).map_err(bootstrap_error)?;
        }

        Ok(())
    }

    fn stage_3_install_core_agents(&self) -> Result<(), AppError> {
        for file in AGENT_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        Ok(())
    }

    fn stage_4_create_workspace_metadata(&self) -> Result<String, AppError> {
        let workspace_id = format!("ws_{}", &uuid::Uuid::new_v4().to_string()[..8]);
        Ok(workspace_id)
    }

    fn stage_5_register_agents(&self) -> Result<Vec<String>, AppError> {
        let agents_dir = self.brainstorm_root.join("agents");
        let mut installed = Vec::new();

        if agents_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&agents_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let manifest = entry.path().join("agent.yaml");
                        if manifest.exists() {
                            if let Some(name) = entry.file_name().to_str() {
                                installed.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }

        installed.sort();
        Ok(installed)
    }

    fn stage_6_build_capability_registry(&self) -> Result<(), AppError> {
        let registry_file = self.brainstorm_root.join("config").join("capability-registry.json");
        if !registry_file.exists() {
            let content = r#"{
  "planning": "planning-agent",
  "knowledge": "knowledge-agent",
  "orchestration": "main-agent",
  "workflow": "main-agent",
  "documentation": "knowledge-agent"
}
"#;
            std::fs::write(registry_file, content).map_err(bootstrap_error)?;
        }
        Ok(())
    }

    fn stage_7_install_workflow_templates(&self) -> Result<(), AppError> {
        for file in WORKFLOW_TEMPLATES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        Ok(())
    }

    fn stage_8_initialize_memory(&self) -> Result<(), AppError> {
        let memory_root = self.brainstorm_root.join("memory");
        for sub in &["shared", "private", "sessions", "cache"] {
            std::fs::create_dir_all(memory_root.join(sub)).map_err(bootstrap_error)?;
        }
        Ok(())
    }

    fn stage_9_initialize_knowledge(&self) -> Result<(), AppError> {
        let knowledge_root = self.brainstorm_root.join("knowledge");
        for sub in &["index", "graph", "chunks", "embeddings"] {
            std::fs::create_dir_all(knowledge_root.join(sub)).map_err(bootstrap_error)?;
        }
        Ok(())
    }

    fn stage_10_validate_and_finalize(
        &self,
        workspace_id: &str,
        installed_agents: &[String],
    ) -> Result<(), AppError> {
        let bootstrap_manifest_file = self.brainstorm_root.join("bootstrap.yaml");
        if !bootstrap_manifest_file.exists() {
            let agents_yaml = installed_agents
                .iter()
                .map(|a| format!("  - {}", a))
                .collect::<Vec<_>>()
                .join("\n");

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
  runtime: true
  agents: true
  workflows: true
  memory: true
  knowledge: true
  settings: true
installed_agents:
{}
schema_version: 1
"#,
                workspace_id, now_secs, agents_yaml
            );

            std::fs::write(bootstrap_manifest_file, manifest_content).map_err(bootstrap_error)?;
        }

        Ok(())
    }

    fn install_configuration_files(&self) -> Result<(), AppError> {
        for file in CONFIGURATION_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
        }
        Ok(())
    }
}

pub fn ensure_project_bootstrap(project_path: &str) -> Result<(), AppError> {
    let engine = BootstrapEngine::new(project_path);
    engine.run()
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

