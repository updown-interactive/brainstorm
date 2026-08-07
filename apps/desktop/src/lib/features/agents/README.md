# Brain Storm Agents Feature Module (v2)

This module implements the **Brain Storm Agent Architecture v2**, providing a self-describing, package-based multi-agent operating system.

## Module Structure

```text
src/lib/features/agents/
├── components/     AgentPackageInspector and Svelte rendering UI
├── controller/     AgentsController for package loading, editing, and state lifecycle
├── data/           AgentRepository Tauri file-system adapter
├── state/          Svelte stores (agentsState)
├── config/         Agent Architecture v2 file schemas, default manifests, and icons
├── types/          Public Agent TypeScript types and interfaces
├── index.ts        Barrel exports
└── README.md       Architecture documentation
```

## Agent Package Layout

Every agent lives in `.brainstorm/agents/<agent-id>/`:

```text
.brainstorm/
└── agents/
    └── <agent-id>/
        ├── agent.yaml
        ├── SYSTEM.md
        ├── ROLE.md
        ├── MEMORY.md
        ├── SKILLS.md
        ├── TOOLS.md
        ├── RULES.md
        ├── WORKFLOW.md
        ├── COMMUNICATION.md
        ├── PROMPTS.md
        ├── KNOWLEDGE.md
        ├── STATUS.md          (generated)
        ├── TASKS.md           (generated)
        ├── HISTORY.md         (generated)
        └── assets/
            ├── avatar.png
            ├── idle.png
            ├── thinking.png
            ├── working.png
            ├── offline.png
            └── banner.png
```
