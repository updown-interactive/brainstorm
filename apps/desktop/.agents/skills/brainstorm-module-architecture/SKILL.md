---
name: brainstorm-module-architecture
description: Enforce the Brainstorm desktop app feature-module architecture and TypeScript practices. Use when adding, moving, refactoring, or reviewing code in src/lib/features/*, when creating new Svelte feature modules, when changing controller/data/state/config/type boundaries, when writing or reviewing feature TypeScript, or when touching SvelteKit routes so routes remain application entry points only.
---

# Brainstorm Module Architecture

Use this skill for the Brainstorm Tauri + SvelteKit desktop app. Keep feature modules predictable, controller-driven, and easy to scan.

## Core Rule

Feature modules live under `src/lib/features/<feature>/` and use the same vocabulary for file roles:

```text
<feature>/
├── components/     Svelte components and feature-local CSS
├── controller/     UI orchestration, view-model state, lifecycle, event handlers
├── data/           persistence, Tauri/core-service adapters, indexing, fetching
├── state/          Svelte stores and state factories
├── config/         constants, defaults, config normalization/persistence helpers
├── types/          public feature TypeScript types
├── index.ts        barrel exports
└── README.md       short architecture map
```

Create a folder only when it contains real files. Do not add empty placeholder folders or `.gitkeep` files.

Feature-specific folders are allowed only when the feature has real code that would be less clear in the core folders:

- `engine/`: rendering, parsing, simulation, editor extensions, schedulers, domain engines.
- `layouts/`: camera, pan/zoom, layout geometry, positioning helpers.

Do not use the old names `ui/`, `services/`, `stores/`, or `repositories/` in feature modules.

## Routes Boundary

`src/routes/` is only the application entry layer.

Routes may:

- import a feature view from `src/lib/features/<feature>/components/...`
- mount that view
- define route-level load or entry concerns when required by SvelteKit

Routes must not:

- contain feature UI logic
- call Tauri commands
- access feature stores directly
- implement data indexing or persistence
- own business rules

Move route logic into the relevant feature `controller/`, `data/`, `state/`, or `config/` folder.

## Folder Responsibilities

### components/

Svelte files are UI-only. Treat every `.svelte` file as a rendering surface, not an implementation surface.

`.svelte` files may only:

- render state exposed by a controller
- bind DOM references needed by a controller
- bind simple input values for display
- forward input/event values to controller methods
- compose other components
- contain component-local styling

`.svelte` files must not contain:

- business logic
- feature functionality logic
- data access or persistence
- Tauri `invoke` calls
- core service calls
- routing decisions
- global-store coordination
- indexing, parsing, graph building, markdown processing, or file operations
- validation rules beyond native HTML attributes
- cross-feature orchestration

All functionality must come from `controller/`. If UI needs behavior, create or extend a controller method and call it from the `.svelte` file. Controllers may coordinate `data/`, `state/`, `config/`, `types/`, `engine/`, or feature-specific implementation folders.

Allowed:

```svelte
<button onclick={filesController.openQuickOpen}>Open</button>
```

Avoid:

```ts
import { invoke } from '@tauri-apps/api/core';
import { projectService } from '$lib/core/service/projectsService';
```

### controller/

Controllers are the interaction boundary for components. Put view-model state, lifecycle hooks, keyboard/pointer event handling, validation, route navigation, and coordination between `data`, `state`, `config`, and `engine` here.

Prefer:

- `controller/index.ts` for the primary feature controller.
- Additional controller files only when a feature has distinct surfaces, such as `file-tree-controller.ts` or `quick-open-controller.ts`.

### data/

Put persistence and external access here:

- Tauri `invoke` wrappers
- filesystem or vault indexing
- core-service adapters
- project/settings storage
- shared registries backed by files

Components should never import from `data/` directly.

### state/

Put Svelte stores and state factories here. Components may consume controller stores; direct feature-store imports from components should be rare and justified.

### config/

Put constants, defaults, config file names, normalization, and config persistence helpers here.

Examples:

- `.brainstorm/graph-config.json`
- `.brainstorm/explorer-config.json`
- default config values
- clamp and normalize helpers

### types/

Put public feature types here. Prefer exporting from `types/index.ts` and re-exporting from the feature `index.ts`.

### engine/

Use only when the feature has real engine code. Examples in this project:

- graph physics, rendering, scheduling
- markdown CodeMirror extensions, frontmatter parsing, live preview

### layouts/

Use only for real layout or camera code. Example:

- graph pan/zoom camera

## Import Rules

Prefer feature barrels for cross-feature public imports:

```ts
import { MarkdownEditor } from '../markdown';
```

Use direct internal imports only inside the same feature or when a feature deliberately depends on another feature’s internal layer.

After moving files, scan for stale architecture names:

```bash
rg -n "features/.*/(ui|services|stores|repositories)|\\.\\.?/(ui|services|stores|repositories)" src/lib src/routes
```

## TypeScript Rules

Write modern, strict TypeScript in every feature layer.

- Do not use `any`, `as any`, or `@ts-ignore` to silence errors. Use `unknown`, narrow it, or isolate unsafe interop in one named boundary with a comment.
- Public/exported functions and controller methods should have explicit return types.
- Prefer `type` for unions, mapped types, data shapes, and function signatures. Use `interface` for public extendable contracts.
- Prefer literal unions and `as const` objects over `enum`.
- Model view state with discriminated unions when boolean flags can create impossible states.
- Use `import type` for type-only imports.
- Prefer named exports. Default exports are acceptable for Svelte components and existing framework conventions.
- Default to `const`; use `let` only for real reassignment.
- Avoid mutating arguments. In Svelte stores, return new objects/maps/arrays when the mutation must be observed reliably.
- Use object parameters for functions with 3+ arguments, especially when arguments share primitive types.
- Keep functions small and single-purpose. If a function does IO, validation, and state mutation, split it across `data/`, controller helpers, and pure utilities.
- Never leave floating promises. Use `await`, return the promise, or intentionally mark fire-and-forget with `void` at the call site.
- Use `Promise.all` for independent async work.
- Throw `Error` instances, not strings. For expected recoverable failures, prefer explicit result state or controller error fields instead of uncaught exceptions.
- Use descriptive names; booleans should read as predicates such as `isLoading`, `hasProject`, `canDelete`, or `shouldFocus`.

Avoid these anti-patterns:

- non-null assertions (`!`) where a guard would prove safety
- deeply nested ternaries
- catch blocks that swallow errors
- stringly typed action names when a union type would prevent mistakes
- controller "god functions" that do data access, parsing, validation, and rendering coordination all at once

## Adding A New Feature

Start with only folders that have real files:

```text
new-feature/
├── components/
├── controller/
├── data/
├── state/
├── config/
├── types/
├── index.ts
└── README.md
```

If a folder would be empty, omit it until it is needed.

The first view goes in `components/`. Its state and actions go through `controller/index.ts`. External IO goes through `data/`. Stores go in `state/`. Constants and normalization go in `config/`. Shared types go in `types/`.

## Refactor Checklist

1. Move files into the architecture folders by role.
2. Update all imports and feature barrel exports.
3. Remove empty folders.
4. Keep `src/routes/` as route-entry only.
5. Keep `.svelte` files UI-only and move functionality into controllers.
6. Ensure TypeScript stays strict: no new `any`, no floating promises, explicit public return types, and no swallowed errors.
7. Update the feature README if folder responsibilities changed.
8. Run:

```bash
pnpm run check
```

The work is not complete until `pnpm run check` has `0 errors` and `0 warnings`.
