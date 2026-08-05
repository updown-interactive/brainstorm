# Files Feature

The Files feature owns the explorer, quick open, and editor pane management.

## Architecture

```
files/
├── components/     Svelte-only views and small UI components
├── controller/     explorer, quick-open, and editor pane controllers
├── data/           vault indexing and filesystem-backed data access
├── state/          file tree and editor pane Svelte stores
├── config/         explorer constants and config persistence
├── types/          public files TypeScript types
├── index.ts        feature barrel exports
└── README.md
```

Components call controllers; controllers coordinate state, data, and config.
Explorer configuration is persisted at `.brainstorm/configuration/explorer-config.json`.
