# Markdown Feature

The Markdown feature owns the CodeMirror editor, live preview, frontmatter
properties, wiki links, and shared tag coloring.

## Architecture

```
markdown/
├── components/     Svelte-only editor components
├── controller/     editor lifecycle, loading, saving, and extension wiring
├── data/           shared tag registry and persisted markdown metadata
├── state/          markdown Svelte store
├── config/         markdown constants
├── types/          public markdown TypeScript types
├── engine/         CodeMirror extensions, frontmatter, preview, theme
├── index.ts        feature barrel exports
└── README.md
```

Components talk to `controller/index.ts`. The controller wires the editor engine
modules and persists content through `state/markdown-state.ts`.
