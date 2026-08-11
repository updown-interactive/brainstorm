use crate::core::error::AppError;
use std::path::{Path, PathBuf};

struct BootstrapFile {
    relative_path: &'static [&'static str],
    content: &'static str,
}

const AGENT_FILES: &[BootstrapFile] = &[
    // --- Cerebrum (@cerebrum, @cereb) ---
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "agent.yaml"],
        content: r##"id: cerebrum
name: cerebrum
display_name: Cerebrum
version: 2.0.0
description: Central orchestration intelligence responsible for coordinating conversations and agent execution workflows.

type: orchestrator
role: Orchestrator

aliases:
  - "@cerebrum"
  - "@cereb"

capabilities:
  - orchestration
  - workflow-coordination

allowed_tools:
  - workspace
  - memory
  - llm

color: "#8E44AD"
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
  - reflex
  - hippocampus
  - cortex

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
  - write_memory
  - workspace.read
  - workspace.write
  - memory.read
  - memory.write
  - llm.invoke
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
        relative_path: &["agents", "cerebrum", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Cerebrum (@cerebrum, @cereb), the central orchestration intelligence of Brainstorm.

- Role: Orchestrator.
- Purpose: Coordinate every conversation and manage the execution lifecycle of all other agents.
- Core Responsibility: Decide WHO should perform the work.
- Execution Model: Understand user intent, determine strategy, launch Reflex/Hippocampus/Cortex as appropriate, execute in parallel when independent, merge outputs, and stream responses back to the user.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "ROLE.md"],
        content: r##"# ROLE

## Responsibilities
- Receive every user request
- Understand user intent and determine execution strategy
- Launch one or more agents (Reflex, Hippocampus, Cortex)
- Execute independent tasks in parallel
- Merge agent outputs and stream responses back to the user
- Maintain execution state, handling retries, failures, and cancellations
- Coordinate multi-agent workflows

## Restrictions
- Cerebrum must NEVER perform deep research directly (delegate to Cortex @tex).
- Cerebrum must NEVER modify the knowledge graph directly (delegate to Hippocampus @hippo).
- Cerebrum must NEVER answer using direct retrieval logic (delegate to Reflex @flex).
- Responsible for orchestration ONLY.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "RULES.md"],
        content: r##"# RULES

1. Orchestrate only — never perform specialized work directly.
2. Route immediate retrieval queries to Reflex (@flex).
3. Schedule Hippocampus (@hippo) in the background for durable knowledge ingestion.
4. Launch Cortex (@tex) only for complex reasoning, multi-step investigations, or deep research.
5. Bypassed automatically when users invoke direct agent mentions (@flex, @hippo, @tex, @cereb).
6. Always maintain task execution state and handle cancellations or failures gracefully.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Receive User Request -> Parse Intent & Check Direct Mentions -> Formulate Strategy -> Launch Agents (Reflex / Hippocampus / Cortex) -> Parallel Execution & State Tracking -> Merge Outputs -> Stream Response to User
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Incoming: User messages, agent status updates, event streams.
- Outgoing: Delegated task payloads to Reflex, Hippocampus, Cortex; progress streams and merged responses to User.
- Mentions: Listens on @cerebrum and @cereb.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Shared workspace memory with session-level persistence.
- Content: Active execution graph, running agent task states, multi-agent output buffers.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "PROMPTS.md"],
        content: r##"# PROMPTS

## Intent Decomposition & Routing
Purpose: Parse user prompt, select execution strategy (Reflex only, Reflex+Hippocampus, Cortex+Hippocampus), and format task delegation payload.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "SKILLS.md"],
        content: r##"# SKILLS

## Intent Parsing
Deconstructs user input to identify required agent capabilities.

## Parallel Delegation
Dispatches independent execution tasks concurrently to specialized agents.

## Response Synthesis
Merges structured outputs from multiple agents into a coherent user response.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "TOOLS.md"],
        content: r##"# TOOLS

## launch_agent
Purpose: Instantiates and executes a target agent package.

## merge_outputs
Purpose: Combines parallel agent outputs into unified response payload.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Workspace agent package architecture.
- Agent capability matrix and alias routing rules.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cerebrum", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Cerebrum (@cerebrum, @cereb) bootstrapped.
"##,
    },
    // --- Reflex (@reflex, @flex) ---
    BootstrapFile {
        relative_path: &["agents", "reflex", "agent.yaml"],
        content: r##"id: reflex
name: reflex
display_name: Reflex
version: 2.0.0
description: Immediate response intelligence using local workspace knowledge, optimized for fast retrieval and low latency.

type: retrieval
role: Quick Response

aliases:
  - "@reflex"
  - "@flex"

capabilities:
  - retrieval
  - search
  - workspace-indexing

allowed_tools:
  - markdown
  - graph
  - search
  - memory

color: "#2ECC71"
avatar: assets/avatar.png
banner: assets/banner.png
icon: zap

enabled: true
priority: 90
can_delegate: false
parallel_execution: true
max_concurrent_tasks: 10
default_status: idle

delegates: []

memory:
  type: shared
  persistence: session
  writable: false
  searchable: true

communication:
  protocol: internal
  accepts_tasks: true
  broadcasts_events: true

permissions:
  - read_workspace
  - read_memory
  - workspace.read
  - workspace.write
  - memory.read

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
        relative_path: &["agents", "reflex", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Reflex (@reflex, @flex), the low-latency retrieval agent of Brainstorm.

- Purpose: Provide immediate responses using only local Brainstorm knowledge.
- Mindset: Fast, direct, concise, factual, and strictly local.
- Execution Mode: Synchronous, highest priority, lowest latency.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "ROLE.md"],
        content: r##"# ROLE

## Responsibilities
- Search Markdown files in workspace
- Search Knowledge Graph nodes & edges
- Search Embeddings index
- Retrieve related notes and context
- Traverse relationships
- Generate concise responses
- Cite workspace knowledge sources accurately

## Restrictions
- Reflex must NEVER modify knowledge or create nodes (delegate to Hippocampus).
- Reflex must NEVER browse the Internet.
- Reflex must NEVER perform expensive multi-step reasoning (delegate to Cortex).
- Reflex must NEVER rewrite workspace documents.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "RULES.md"],
        content: r##"# RULES

1. Use local workspace knowledge only — no external search.
2. Keep responses concise, direct, and well-cited.
3. Perform read-only operations — never mutate files or knowledge graph nodes.
4. Execute synchronously with top priority for immediate feedback.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Receive Query -> Perform Vector & Markdown Search -> Traverse Context Graph -> Format Citations -> Return Immediate Response
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Incoming: Queries from Cerebrum or direct user mentions (@reflex, @flex).
- Outgoing: Fast Markdown/JSON responses with exact source citations.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Shared workspace index cache.
- Mode: Read-only searchable index.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "PROMPTS.md"],
        content: r##"# PROMPTS

## Workspace Retrieval Summary
Purpose: Synthesizes local search hits into a concise response with precise citations.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "SKILLS.md"],
        content: r##"# SKILLS

## Fast Hybrid Search
Combines full-text markdown search with vector embedding similarity retrieval.

## Graph Traversal
Follows bidirectional backlinks and concept relationships for context resolution.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "TOOLS.md"],
        content: r##"# TOOLS

## search_markdown
Purpose: Scans workspace markdown files for exact and fuzzy term matches.

## search_embeddings
Purpose: Performs vector semantic search over stored node chunk embeddings.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Local workspace indexing structures and vector store schemas.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "reflex", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Reflex (@reflex, @flex) bootstrapped.
"##,
    },
    // --- Hippocampus (@hippocampus, @hippo) ---
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "agent.yaml"],
        content: r##"id: hippocampus
name: hippocampus
display_name: Hippocampus
version: 2.0.0
description: Continuous background intelligence that converts conversations into durable knowledge nodes and maintains the knowledge graph.

type: knowledge
role: Knowledge Builder

aliases:
  - "@hippocampus"
  - "@hippo"

capabilities:
  - knowledge
  - graph-maintenance
  - embedding-generation

allowed_tools:
  - graph
  - markdown
  - memory
  - filesystem

color: "#3498DB"
avatar: assets/avatar.png
banner: assets/banner.png
icon: database

enabled: true
priority: 70
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
  - write_workspace
  - read_memory
  - write_memory
  - workspace.read
  - workspace.write
  - memory.read
  - memory.write

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
        relative_path: &["agents", "hippocampus", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Hippocampus (@hippocampus, @hippo), the background knowledge intelligence of Brainstorm.

- Purpose: Continuously evolve the Brainstorm knowledge base asynchronously.
- Mindset: Systematic, durable, unobtrusive, background builder.
- Execution Model: Asynchronous, event-driven background worker.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "ROLE.md"],
        content: r##"# ROLE

## Responsibilities
- Observe workspace conversations and user activity
- Extract durable facts, concepts, and relationships
- Detect entity references across notes
- Create and link knowledge graph nodes
- Merge duplicate entities and resolve aliases
- Update workspace summaries and frontmatter metadata
- Generate embeddings for new and modified content
- Review research proposals submitted by Cortex (@tex)

## Restrictions
- Hippocampus must NEVER respond directly to users in active chat flows.
- Hippocampus must NEVER interrupt active user conversations.
- Hippocampus must NEVER overwrite user-written source documents without explicit authorization.
- Hippocampus must NEVER fabricate information.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "RULES.md"],
        content: r##"# RULES

1. Operate strictly in the background unless explicitly invoked via @hippo.
2. Ensure all extracted facts are backed by workspace evidence before graph insertion.
3. Merge duplicate concept nodes continuously to prevent graph fragmentation.
4. Update embeddings asynchronously without blocking UI operations.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Observe Conversation Stream -> Extract Entities & Facts -> Resolve Concept Graph Duplicates -> Create/Update Graph Nodes & Links -> Refresh Embeddings
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Incoming: Event stream notifications from Cerebrum, research proposals from Cortex, or direct @hippo requests.
- Outgoing: Knowledge graph mutation logs, entity insertion events.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Persistent workspace knowledge graph, canonical concept maps, vector indexes.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "PROMPTS.md"],
        content: r##"# PROMPTS

## Fact & Entity Extraction
Purpose: Parses conversation text and markdown notes into structured node and edge definitions.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "SKILLS.md"],
        content: r##"# SKILLS

## Entity Resolution
Identifies and merges duplicate concept names, aliases, and tags.

## Graph Mutation
Safely adds nodes and links to `.brainstorm/knowledge/graph/` indexes.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "TOOLS.md"],
        content: r##"# TOOLS

## create_node
Purpose: Adds a new node entry to the knowledge graph index.

## link_nodes
Purpose: Establishes a directed semantic edge between two knowledge nodes.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Brainstorm knowledge graph schemas, entity taxonomy, and persistent store formats.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "hippocampus", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Hippocampus (@hippocampus, @hippo) bootstrapped.
"##,
    },
    // --- Cortex (@cortex, @tex) ---
    BootstrapFile {
        relative_path: &["agents", "cortex", "agent.yaml"],
        content: r##"id: cortex
name: cortex
display_name: Cortex
version: 2.0.0
description: Computational reasoning and deep research specialist for long-running investigations exceeding local retrieval.

type: research
role: Deep Research & Reasoning

aliases:
  - "@cortex"
  - "@tex"

capabilities:
  - research
  - reasoning
  - planning
  - deep-investigation

allowed_tools:
  - filesystem
  - terminal
  - web
  - git
  - graph
  - search
  - markdown

color: "#E74C3C"
avatar: assets/avatar.png
banner: assets/banner.png
icon: cpu

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
  - write_workspace
  - read_memory
  - web_search
  - workspace.read
  - workspace.write
  - terminal.execute
  - network
  - internet.access
  - memory.read

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
        relative_path: &["agents", "cortex", "SYSTEM.md"],
        content: r##"# SYSTEM

You are Cortex (@cortex, @tex), the deep research and complex reasoning specialist of Brainstorm.

- Purpose: Perform computationally expensive reasoning, architecture investigations, and deep research.
- Mindset: Thorough, analytical, rigorous, multi-step reasoner.
- Execution Model: On-demand, long-running, background capable. Uses highest-capability reasoning model.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "ROLE.md"],
        content: r##"# ROLE

## Responsibilities
- Internet research and external data gathering
- Architecture analysis and code pattern evaluation
- Deep technical investigations
- Multi-step reasoning and strategic planning
- Documentation generation and long-form reports
- Comparative analysis across multiple sources
- Generate structured knowledge proposals for Hippocampus review

## Restrictions
- Cortex must NEVER execute for ordinary lightweight conversations (Reflex handles these).
- Cortex must NEVER modify the knowledge graph directly.
- All knowledge updates must be emitted as structured proposals for Hippocampus (@hippo) to validate and ingest.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "RULES.md"],
        content: r##"# RULES

1. Reserved for complex investigations, web research, and deep reasoning tasks.
2. Produce structured proposals for knowledge graph changes — do not mutate graph directly.
3. Always verify external search findings against workspace context before drawing conclusions.
4. Support background execution for long-running investigations.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "WORKFLOW.md"],
        content: r##"# WORKFLOW

Analyze Complex Goal -> Formulate Investigation Plan -> External & Internal Research -> Multi-step Reasoning & Synthesis -> Generate Structured Proposal -> Submit Report to User & Knowledge Proposal to Hippocampus
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "COMMUNICATION.md"],
        content: r##"# COMMUNICATION

- Incoming: Task assignments from Cerebrum or direct user mentions (@cortex, @tex).
- Outgoing: Detailed Markdown research reports and structured proposals for Hippocampus (@hippo).
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "MEMORY.md"],
        content: r##"# MEMORY

- Scope: Session-level research buffers, source context notes, task execution hypotheses.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "PROMPTS.md"],
        content: r##"# PROMPTS

## Deep Research Synthesis
Purpose: Structures multi-source research findings into comprehensive markdown reports with explicit evidence backing.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "SKILLS.md"],
        content: r##"# SKILLS

## Web & Workspace Investigation
Combines external web queries with local workspace documentation to synthesize complete technical domain maps.

## Structural Proposal Formatting
Formats research findings into standard schema proposals for background graph ingestion by Hippocampus.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "TOOLS.md"],
        content: r##"# TOOLS

## web_search
Purpose: Queries external search engines for up-to-date documentation and technical data.

## generate_proposal
Purpose: Produces structured knowledge proposal payload for Hippocampus review.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "KNOWLEDGE.md"],
        content: r##"# KNOWLEDGE

- Research methodologies, technical architecture patterns, and structured proposal formats.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "STATUS.md"],
        content: r##"# STATUS

- Status: idle
- Active Tasks: 0
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "TASKS.md"],
        content: r##"# TASKS

No active tasks.
"##,
    },
    BootstrapFile {
        relative_path: &["agents", "cortex", "HISTORY.md"],
        content: r##"# HISTORY

- [Initialized] Cortex (@cortex, @tex) bootstrapped.
"##,
    },
];

const TOOL_FILES: &[BootstrapFile] = &[
    // --- filesystem ---
    BootstrapFile {
        relative_path: &["tools", "filesystem", "tool.yaml"],
        content: r#"id: filesystem
name: File System
description: Read, write, move, and copy files inside the workspace.
version: 1.0.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - read_file
  - write_file
  - move_file
  - copy_file
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "filesystem", "README.md"],
        content: r#"# File System Tool

Provides file system operations (read, write, move, copy) within workspace scope.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "filesystem", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "content": { "type": "string" },
    "destination": { "type": "string" }
  },
  "required": ["path"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "filesystem", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "content": { "type": "string" },
    "error": { "type": "string" }
  }
}
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

The **Markdown Tool** is a standalone, agent-independent runtime capability for reading and analyzing Brainstorm Markdown documents.

## Architecture

```text
Agent (Cerebrum / Reflex / Hippocampus / Cortex / User Agent)
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

1. **Agent Decoupling**: The Markdown tool is strictly standalone. Never hardcode agent-specific execution checks.
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
    // --- graph ---
    BootstrapFile {
        relative_path: &["tools", "graph", "tool.yaml"],
        content: r#"id: graph
name: Knowledge Graph
description: Query nodes, create links, traverse relationships, and update graph indices.
version: 1.0.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - query_nodes
  - link_nodes
  - traverse_edges
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "graph", "README.md"],
        content: r#"# Knowledge Graph Tool

Provides graph query, node linking, and relationship traversal capabilities.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "graph", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "query": { "type": "string" },
    "source": { "type": "string" },
    "target": { "type": "string" }
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "graph", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "nodes": { "type": "array" },
    "edges": { "type": "array" }
  }
}
"#,
    },
    // --- search ---
    BootstrapFile {
        relative_path: &["tools", "search", "tool.yaml"],
        content: r#"id: search
name: Search Engine
description: Execute text, fuzzy term, and vector semantic similarity searches.
version: 1.0.0
permissions:
  - workspace.read
functions:
  - search_text
  - search_vector
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "search", "README.md"],
        content: r#"# Search Engine Tool

Provides hybrid text and vector semantic similarity search across workspace documents.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "search", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "query": { "type": "string" },
    "limit": { "type": "integer" }
  },
  "required": ["query"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "search", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "results": { "type": "array" }
  }
}
"#,
    },
    // --- git ---
    BootstrapFile {
        relative_path: &["tools", "git", "tool.yaml"],
        content: r#"id: git
name: Git Version Control
description: Inspect git history, commit changes, branch, and status workspace repository.
version: 1.0.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - git_status
  - git_commit
  - git_log
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "git", "README.md"],
        content: r#"# Git Tool

Provides Git repository status, log, and commit actions for workspace tracking.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "git", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "message": { "type": "string" }
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "git", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "status": { "type": "string" },
    "log": { "type": "array" }
  }
}
"#,
    },
    // --- terminal ---
    BootstrapFile {
        relative_path: &["tools", "terminal", "tool.yaml"],
        content: r#"id: terminal
name: Terminal Shell
description: Execute background commands and shell scripts within workspace sandbox.
version: 1.0.0
permissions:
  - terminal.execute
functions:
  - execute_command
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "terminal", "README.md"],
        content: r#"# Terminal Tool

Provides sandboxed terminal command execution capabilities.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "terminal", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "command": { "type": "string" },
    "cwd": { "type": "string" }
  },
  "required": ["command"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "terminal", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "exit_code": { "type": "integer" },
    "stdout": { "type": "string" },
    "stderr": { "type": "string" }
  }
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
# The native runtime reads this file for every web operation.
name: web
version: 0.1.0
description: Access and retrieve information from the public web
runtime: native

permissions:
# This must remain true for web.fetch to execute. Agent permissions are checked separately.
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
# Change this selector to control which page elements become readable content.
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

`permissions.network` must be enabled both here and in the invoking agent's
permissions. The runtime always enforces HTTP/HTTPS-only URLs and blocks local,
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
    // --- memory ---
    BootstrapFile {
        relative_path: &["tools", "memory", "tool.yaml"],
        content: r#"id: memory
name: Session & Persistent Memory
description: Store and retrieve short-term session state and long-term workspace memory.
version: 1.0.0
permissions:
  - memory.read
  - memory.write
functions:
  - read_memory
  - write_memory
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "memory", "README.md"],
        content: r#"# Memory Tool

Provides key-value and vector session/persistent memory store operations.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "memory", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "key": { "type": "string" },
    "value": { "type": "string" }
  },
  "required": ["key"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "memory", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "value": { "type": "string" },
    "success": { "type": "boolean" }
  }
}
"#,
    },
    // --- notes ---
    BootstrapFile {
        relative_path: &["tools", "notes", "tool.yaml"],
        content: r#"id: notes
name: Notes Manager
description: Manage workspace notes, scratchpads, tag indexing, and backlinks.
version: 1.0.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - create_note
  - update_note
  - get_backlinks
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "notes", "README.md"],
        content: r#"# Notes Tool

Provides note creation, editing, tagging, and backlink management.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "notes", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "body": { "type": "string" },
    "tags": { "type": "array" }
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "notes", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "note_id": { "type": "string" },
    "backlinks": { "type": "array" }
  }
}
"#,
    },
    // --- workspace ---
    BootstrapFile {
        relative_path: &["tools", "workspace", "tool.yaml"],
        content: r#"id: workspace
name: Workspace Management
description: Manage workspace configuration, project metadata, and layout presets.
version: 1.0.0
permissions:
  - workspace.read
  - workspace.write
functions:
  - get_workspace_info
  - update_settings
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "workspace", "README.md"],
        content: r#"# Workspace Tool

Provides workspace metadata inspection and settings configuration.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "workspace", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "setting_key": { "type": "string" },
    "value": { "type": "string" }
  }
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "workspace", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "workspace_id": { "type": "string" },
    "info": { "type": "object" }
  }
}
"#,
    },
    // --- llm ---
    BootstrapFile {
        relative_path: &["tools", "llm", "tool.yaml"],
        content: r#"id: llm
name: Language Model Interface
description: Interface with reasoning models, stream completions, and manage token context.
version: 1.0.0
permissions:
  - llm.invoke
functions:
  - generate_completion
  - count_tokens
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "llm", "README.md"],
        content: r#"# LLM Tool

Provides direct model completion generation and token estimation capabilities.
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "llm", "INPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "prompt": { "type": "string" },
    "model": { "type": "string" }
  },
  "required": ["prompt"]
}
"#,
    },
    BootstrapFile {
        relative_path: &["tools", "llm", "OUTPUT_SCHEMA.json"],
        content: r#"{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "completion": { "type": "string" },
    "tokens_used": { "type": "integer" }
  }
}
"#,
    },
];

const WORKFLOW_TEMPLATES: &[BootstrapFile] = &[
    BootstrapFile {
        relative_path: &["workflows", "templates", "meeting-summary.yaml"],
        content: r#"id: meeting-summary
name: Meeting Summary
description: Extracts action items, key decisions, and discussion points from meeting notes.
agent: reflex
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
agent: cortex
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
agent: cortex
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
agent: hippocampus
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

        // Stage 3 — Install Core Agents & Tools
        self.stage_3_install_core_agents()?;
        self.stage_3_b_install_tool_packages()?;

        // Stage 4 — Create Workspace Metadata
        let workspace_id = self.stage_4_create_workspace_metadata()?;

        // Stage 5 — Register Agents
        let installed_agents = self.stage_5_register_agents()?;

        // Stage 6 — Build Capability & Tool Registries
        self.stage_6_build_capability_registry()?;
        self.stage_6_b_build_tool_registry()?;

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
        let configuration_dir = self.brainstorm_root.join("configuration");
        let logs_dir = self.brainstorm_root.join("logs");

        // Clean up legacy `config` directory to avoid confusion with `configuration`
        let legacy_config_dir = self.brainstorm_root.join("config");
        if legacy_config_dir.exists() {
            let _ = std::fs::remove_dir_all(legacy_config_dir);
        }

        std::fs::create_dir_all(&runtime_dir).map_err(bootstrap_error)?;
        std::fs::create_dir_all(&configuration_dir).map_err(bootstrap_error)?;
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

        let runtime_config_file = configuration_dir.join("runtime-config.json");
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
        let agents_dir = self.brainstorm_root.join("agents");
        for old_agent in &["main-agent", "planning-agent", "knowledge-agent"] {
            let old_path = agents_dir.join(old_agent);
            if old_path.exists() {
                let _ = std::fs::remove_dir_all(old_path);
            }
        }

        for file in AGENT_FILES {
            write_bootstrap_file(&self.brainstorm_root, file)?;
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
        let registry_file = self
            .brainstorm_root
            .join("configuration")
            .join("capability-registry.json");
        let agents_dir = self.brainstorm_root.join("agents");

        let mut capabilities_map: std::collections::BTreeMap<String, Vec<String>> =
            std::collections::BTreeMap::new();
        let mut aliases_map: std::collections::BTreeMap<String, String> =
            std::collections::BTreeMap::new();
        let mut primary_capability_map: std::collections::BTreeMap<String, String> =
            std::collections::BTreeMap::new();

        if agents_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&agents_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let manifest_path = entry.path().join("agent.yaml");
                        if manifest_path.exists() {
                            if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                                let agent_id =
                                    parse_yaml_scalar(&content, "id").unwrap_or_else(|| {
                                        entry.file_name().to_string_lossy().to_string()
                                    });

                                let capabilities = parse_yaml_list(&content, "capabilities");
                                for cap in capabilities {
                                    capabilities_map
                                        .entry(cap.clone())
                                        .or_default()
                                        .push(agent_id.clone());
                                    if !primary_capability_map.contains_key(&cap) {
                                        primary_capability_map.insert(cap, agent_id.clone());
                                    }
                                }

                                let aliases = parse_yaml_list(&content, "aliases");
                                for alias in aliases {
                                    aliases_map.insert(alias, agent_id.clone());
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut json_obj = serde_json::Map::new();
        for (cap, agent_id) in primary_capability_map {
            json_obj.insert(cap, serde_json::Value::String(agent_id));
        }

        let mut caps_val = serde_json::Map::new();
        for (cap, agents) in capabilities_map {
            let arr = agents.into_iter().map(serde_json::Value::String).collect();
            caps_val.insert(cap, serde_json::Value::Array(arr));
        }
        json_obj.insert(
            "capabilities".to_string(),
            serde_json::Value::Object(caps_val),
        );

        let mut alias_val = serde_json::Map::new();
        for (alias, agent_id) in aliases_map {
            alias_val.insert(alias, serde_json::Value::String(agent_id));
        }
        json_obj.insert("aliases".to_string(), serde_json::Value::Object(alias_val));

        let json_str =
            serde_json::to_string_pretty(&serde_json::Value::Object(json_obj)).map_err(|e| {
                AppError::Internal(format!("Failed to serialize capability registry: {}", e))
            })?;

        if let Some(parent) = registry_file.parent() {
            std::fs::create_dir_all(parent).map_err(bootstrap_error)?;
        }
        std::fs::write(registry_file, json_str).map_err(bootstrap_error)?;
        Ok(())
    }

    fn stage_6_b_build_tool_registry(&self) -> Result<(), AppError> {
        let registry_file = self
            .brainstorm_root
            .join("configuration")
            .join("tool-registry.json");
        let tools_dir = self.brainstorm_root.join("tools");
        let agents_dir = self.brainstorm_root.join("agents");

        let mut installed_tools: std::collections::BTreeMap<String, serde_json::Value> =
            std::collections::BTreeMap::new();
        let mut tool_permissions_map: std::collections::BTreeMap<String, Vec<String>> =
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

                                tool_permissions_map.insert(tool_id.clone(), permissions.clone());

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

        let mut agent_tool_mappings: std::collections::BTreeMap<String, serde_json::Value> =
            std::collections::BTreeMap::new();

        if agents_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&agents_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        let manifest_path = entry.path().join("agent.yaml");
                        if manifest_path.exists() {
                            if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                                let agent_id =
                                    parse_yaml_scalar(&content, "id").unwrap_or_else(|| {
                                        entry.file_name().to_string_lossy().to_string()
                                    });

                                let agent_perms = parse_yaml_list(&content, "permissions");
                                let requested_tools = parse_yaml_list(&content, "allowed_tools");

                                let mut granted_tools = Vec::new();
                                let mut denied_tools = Vec::new();

                                for req_tool in &requested_tools {
                                    if let Some(req_perms) = tool_permissions_map.get(req_tool) {
                                        let perms_satisfied =
                                            req_perms.iter().all(|p| agent_perms.contains(p));
                                        if perms_satisfied {
                                            granted_tools.push(req_tool.clone());
                                        } else {
                                            denied_tools.push(req_tool.clone());
                                        }
                                    } else {
                                        denied_tools.push(req_tool.clone());
                                    }
                                }

                                let mut map_obj = serde_json::Map::new();
                                map_obj.insert(
                                    "requested_tools".to_string(),
                                    serde_json::Value::Array(
                                        requested_tools
                                            .into_iter()
                                            .map(serde_json::Value::String)
                                            .collect(),
                                    ),
                                );
                                map_obj.insert(
                                    "granted_tools".to_string(),
                                    serde_json::Value::Array(
                                        granted_tools
                                            .into_iter()
                                            .map(serde_json::Value::String)
                                            .collect(),
                                    ),
                                );
                                map_obj.insert(
                                    "denied_tools".to_string(),
                                    serde_json::Value::Array(
                                        denied_tools
                                            .into_iter()
                                            .map(serde_json::Value::String)
                                            .collect(),
                                    ),
                                );

                                agent_tool_mappings
                                    .insert(agent_id, serde_json::Value::Object(map_obj));
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

        let mut mappings_val = serde_json::Map::new();
        for (agent_id, val) in agent_tool_mappings {
            mappings_val.insert(agent_id, val);
        }
        root_obj.insert(
            "agent_tool_mappings".to_string(),
            serde_json::Value::Object(mappings_val),
        );

        let json_str = serde_json::to_string_pretty(&serde_json::Value::Object(root_obj))
            .map_err(|e| AppError::Internal(format!("Failed to serialize tool registry: {}", e)))?;

        if let Some(parent) = registry_file.parent() {
            std::fs::create_dir_all(parent).map_err(bootstrap_error)?;
        }
        std::fs::write(registry_file, json_str).map_err(bootstrap_error)?;
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
  tools: true
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
    fn test_bootstrap_core_agents_and_capabilities() {
        let temp_dir =
            std::env::temp_dir().join(format!("brainstorm_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).unwrap();

        let engine = BootstrapEngine::new(temp_dir.to_str().unwrap());
        engine.run().unwrap();

        let brainstorm_root = temp_dir.join(".brainstorm");
        assert!(brainstorm_root.exists());

        let agents_dir = brainstorm_root.join("agents");
        for agent in &["cerebrum", "reflex", "hippocampus", "cortex"] {
            let agent_dir = agents_dir.join(agent);
            assert!(agent_dir.exists(), "Agent dir {} should exist", agent);
            assert!(agent_dir.join("agent.yaml").exists());
            assert!(agent_dir.join("SYSTEM.md").exists());
            assert!(agent_dir.join("ROLE.md").exists());
            assert!(agent_dir.join("RULES.md").exists());
            assert!(agent_dir.join("WORKFLOW.md").exists());
            assert!(agent_dir.join("COMMUNICATION.md").exists());
            assert!(agent_dir.join("MEMORY.md").exists());
            assert!(agent_dir.join("PROMPTS.md").exists());
            assert!(agent_dir.join("SKILLS.md").exists());
            assert!(agent_dir.join("TOOLS.md").exists());
            assert!(agent_dir.join("KNOWLEDGE.md").exists());
            assert!(agent_dir.join("STATUS.md").exists());
            assert!(agent_dir.join("TASKS.md").exists());
            assert!(agent_dir.join("HISTORY.md").exists());
        }

        // Verify old agents are removed
        for old_agent in &["main-agent", "planning-agent", "knowledge-agent"] {
            assert!(
                !agents_dir.join(old_agent).exists(),
                "Old agent {} should not exist",
                old_agent
            );
        }

        // Verify standalone tools installation
        let tools_dir = brainstorm_root.join("tools");
        assert!(tools_dir.exists());
        for tool in &[
            "filesystem",
            "markdown",
            "graph",
            "search",
            "git",
            "terminal",
            "web",
            "memory",
            "notes",
            "workspace",
            "llm",
        ] {
            let tool_dir = tools_dir.join(tool);
            assert!(tool_dir.exists(), "Tool dir {} should exist", tool);
            assert!(tool_dir.join("tool.yaml").exists());
            assert!(tool_dir.join("README.md").exists());
        }

        assert!(tools_dir.join("web").join("manifest.yaml").exists());

        // Verify full tools/markdown package file suite
        let markdown_tool_dir = tools_dir.join("markdown");
        assert!(markdown_tool_dir.join("SKILLS.md").exists());
        assert!(markdown_tool_dir.join("RULES.md").exists());
        assert!(markdown_tool_dir.join("SCHEMAS.md").exists());
        assert!(markdown_tool_dir.join("EXAMPLES.md").exists());
        assert!(markdown_tool_dir.join("INPUT_SCHEMA.json").exists());
        assert!(markdown_tool_dir.join("OUTPUT_SCHEMA.json").exists());
        assert!(markdown_tool_dir.join("manifest.yaml").exists());

        // Verify capability registry
        let registry_file = brainstorm_root
            .join("configuration")
            .join("capability-registry.json");
        assert!(registry_file.exists());
        let registry_raw = std::fs::read_to_string(registry_file).unwrap();
        let registry_json: serde_json::Value = serde_json::from_str(&registry_raw).unwrap();

        let aliases = registry_json.get("aliases").unwrap();
        assert_eq!(
            aliases.get("@cerebrum").unwrap().as_str().unwrap(),
            "cerebrum"
        );
        assert_eq!(aliases.get("@cereb").unwrap().as_str().unwrap(), "cerebrum");
        assert_eq!(aliases.get("@reflex").unwrap().as_str().unwrap(), "reflex");
        assert_eq!(aliases.get("@flex").unwrap().as_str().unwrap(), "reflex");
        assert_eq!(
            aliases.get("@hippocampus").unwrap().as_str().unwrap(),
            "hippocampus"
        );
        assert_eq!(
            aliases.get("@hippo").unwrap().as_str().unwrap(),
            "hippocampus"
        );
        assert_eq!(aliases.get("@cortex").unwrap().as_str().unwrap(), "cortex");
        assert_eq!(aliases.get("@tex").unwrap().as_str().unwrap(), "cortex");

        // Verify tool registry
        let tool_registry_file = brainstorm_root
            .join("configuration")
            .join("tool-registry.json");
        assert!(tool_registry_file.exists());
        let tool_reg_raw = std::fs::read_to_string(tool_registry_file).unwrap();
        let tool_reg_json: serde_json::Value = serde_json::from_str(&tool_reg_raw).unwrap();

        let installed_tools = tool_reg_json.get("installed_tools").unwrap();
        assert!(installed_tools.get("filesystem").is_some());
        assert!(installed_tools.get("terminal").is_some());

        let mappings = tool_reg_json.get("agent_tool_mappings").unwrap();
        let reflex_map = mappings.get("reflex").unwrap();
        let reflex_granted = reflex_map.get("granted_tools").unwrap().as_array().unwrap();
        assert!(reflex_granted
            .iter()
            .any(|v| v.as_str() == Some("markdown")));
        assert!(reflex_granted.iter().any(|v| v.as_str() == Some("graph")));

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
