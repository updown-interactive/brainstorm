# Onboarding Feature

The Onboarding feature owns the splash redirect and project creation flow.

## Architecture

```
onboarding/
├── components/     Svelte-only onboarding and splash views
├── controller/     form state, validation, routing, and submit actions
├── data/           project creation and folder picker adapters
├── state/          onboarding Svelte store
├── config/         onboarding constants
├── types/          public onboarding TypeScript types
├── index.ts        feature barrel exports
└── README.md
```

Components call `controller/index.ts`; the controller uses `data/onboarding-service.ts`
for project lookup, project creation, and folder selection.
