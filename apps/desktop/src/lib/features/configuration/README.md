# Configuration Feature

The Configuration feature owns the `.brainstorm/configuration` browser, structured
configuration editors, and JSON inspector.

## Architecture

```
configuration/
├── components/     Svelte-only configuration views and JSON inspector surface
├── controller/     configuration list, structured config state, and JSON editor orchestration
├── index.ts        feature barrel exports
└── README.md
```

Components call `controller/index.ts`; persistence remains in the owning feature
config helpers for explorer, graph, and markdown tag settings.
