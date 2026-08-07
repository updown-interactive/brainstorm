# Markdown Feature

The Markdown feature owns the CodeMirror editor, Live Preview Engine v2, frontmatter properties, wiki links, and shared tag coloring.

## Architecture

```
markdown/
├── components/     Svelte-only editor components
├── controller/     editor lifecycle, loading, saving, and extension wiring
├── data/           shared tag registry and persisted markdown metadata
├── state/          markdown Svelte store
├── config/         markdown constants
├── types/          public markdown TypeScript types
├── engine/         Live Preview Engine v2, parser, cache, viewport, scheduler, renderers
│   ├── parser/         incremental block parser, AST builder, hashing & node versioning
│   ├── cache/          LRU cache, AST cache, decoration cache, DOM cache, image cache, SVG cache
│   ├── viewport/       viewport range bounds manager, virtualization, lazy visibility observer
│   ├── scheduler/      5-tier task render scheduler with typing interrupts
│   ├── renderer/       viewport renderer, DOM reconciler, 4-layer decoration builder, widget manager
│   ├── renderers/      Mermaid, table, lazy image, math block, callout, and HTML block renderers
│   └── services/       background document indexer, outline, links, tags, and statistics
├── index.ts        feature barrel exports
└── README.md
```

Components talk to `controller/index.ts`. The controller wires the editor engine modules and persists content through `state/markdown-state.ts`.
