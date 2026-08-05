# Settings Feature

The Settings feature owns project settings, appearance settings, provider
settings, and the entry point for the Configuration feature.

## Architecture

```
settings/
├── components/     Svelte-only settings views
├── controller/     settings view-model state and UI actions
├── data/           project/theme persistence adapters
├── state/          active settings tab store
├── config/         settings constants
├── types/          public settings TypeScript types
├── index.ts        feature barrel exports
└── README.md
```

Components call `controller/index.ts`; the controller uses `data/settings-service.ts`
for project, theme, clipboard, and shell-state persistence.
