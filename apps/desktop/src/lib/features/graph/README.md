# Graph Feature

The Graph feature renders the project markdown vault as an Obsidian-style canvas graph.

## Architecture

```
graph/
├── components/     Svelte-only UI components
├── controller/     UI orchestration, lifecycle, interaction handlers
├── data/           vault graph data access
├── state/          Svelte stores and runtime graph state
├── config/         constants and .brainstorm/configuration/graph-config.json persistence
├── types/          public graph TypeScript types
├── engine/         graph build, physics, renderer, scheduler
├── layouts/        camera, pan/zoom, layout helpers
├── index.ts        feature barrel exports
└── README.md
```

## Flow

`components/GraphView.svelte` delegates lifecycle and events to `controller/index.ts`.
The controller reads data through `data/graph-data.ts`, persists config through
`config/graph-config.ts`, runs layout through `engine/graph-physics.ts`, and draws
through `engine/graph-renderer.ts`.

Graph configuration is persisted at `.brainstorm/configuration/graph-config.json`.
