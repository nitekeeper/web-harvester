# ADR-022: UI Page Composition Roots for Popup, Settings, and Side-Panel

**Status:** Accepted
**Date:** 2026-05-04

## Context

ADR-020 established that `presentation/background/background.ts` is the extension's composition root, with a narrow ESLint carve-out that disables `import/no-restricted-paths` for that file so it can import from `infrastructure/`. ADR-020 explicitly noted that "other presentation entry points that need to compose layers (popup bootstrap, settings page bootstrap, side-panel bootstrap) may extend the same override path-glob."

The three UI pages (popup, settings, side-panel) each have React SPA entry points that previously used module-level Zustand singletons with no chrome.storage sync, and the settings page passed only NOOP handlers to its sections. These pages now need:

1. **Chrome storage sync** — `useSettingsStore` and `usePopupStore` singletons must load persisted state on mount and persist changes back to `chrome.storage.local`.
2. **IDB-backed destinations** — the settings page must load `FileSystemDirectoryHandle`-bearing destinations from IndexedDB and wire the FSA picker to add new ones.
3. **Template management** — the settings page must wire add/remove/update handlers for the templates section.

Three approaches were considered:

- **Option A — Zustand context pattern**: Replace the singletons with factory-created stores passed via React context. Pros: clean DI. Cons: requires updating every consumer of `useSettingsStore` and `usePopupStore`; large diff across many files for little composition-root benefit.
- **Option B — Bootstrap existing singletons**: Wire chrome.storage sync to the existing singletons from the entry points using `subscribe()` + `setState()` + `onChanged()`. Pros: zero component changes; backward-compatible. Cons: re-implements part of `withStorageSync`; requires a flag to break the persist→onChanged feedback loop.
- **Option C — Replace singletons at module level**: Export a mutable reference and swap it at init time. Pros: conceptually clean. Cons: module-level mutation is fragile and breaks React StrictMode's double-invoke.

Option B was chosen. A generic `bootstrapStore` utility wires sync to any existing `StoreApi` and is tested independently. The shared key-extraction helper (`extractKeyChange`) lives in `storageSyncMiddleware.ts` so the two consumers (the middleware + `bootstrapStore`) avoid the duplicated `onChanged` payload narrowing logic.

For the settings composition root, `FileSystemDirectoryHandle` objects cannot be serialized to `chrome.storage.local` (they are IDB-only). The `bootstrapStore` `serialize` option excludes `destinations` and `isLoading` from what is persisted to chrome.storage; destinations are loaded separately from IndexedDB on each page open.

`IDestinationPort` (a presentation-layer port interface) is defined so `Settings.tsx` and the destination handlers hook can depend on an abstraction rather than the infrastructure `IDestinationStorage` type. This preserves the `presentation/ → application/ + shared/` layer rule for component files. The composition root file (`settings.ts`) has the carve-out and assigns `IDestinationStorage` to `IDestinationPort` via structural typing — the two interfaces are deliberately field-compatible (`Destination` matches `DestinationView` field-for-field).

## Decision

- `eslint.config.ts`: The ADR-020 `import/no-restricted-paths: off` override is extended to cover `src/presentation/popup/index.tsx`, `src/presentation/settings/settings.ts`, and `src/presentation/side-panel/side-panel.ts`.
- `src/presentation/stores/bootstrapStore.ts`: Generic async utility that wires chrome.storage sync to a Zustand `StoreApi` singleton. Loads initial state first (so the React tree never renders empty when storage has data), then wires the persistence subscriber and the `onChanged` listener. An internal `applyingExternal` flag suppresses the persistence subscriber while applying an external change so we never echo a value we just received.
- `src/presentation/stores/storageSyncMiddleware.ts`: Adds the shared `extractKeyChange` helper used by both `withStorageSync` and `bootstrapStore` to narrow `onChanged` payloads.
- `src/presentation/ports/IDestinationPort.ts`: Presentation-layer port interface for destination CRUD; keeps `Settings.tsx` within layer bounds.
- `src/presentation/settings/DestinationStorageContext.tsx`: React context providing `IDestinationPort` to the settings component tree.
- `src/presentation/settings/useDestinationHandlers.ts`: Hook composing FSA picker + IDB calls + store updates for the destinations section.
- `src/presentation/settings/useTemplateHandlers.ts`: Hook wrapping pure Zustand template mutations for the templates section.
- `src/presentation/settings/Settings.tsx`: Wires the section components to real props read from the singleton settings store and the two handler hooks.
- `src/presentation/popup/index.tsx`, `settings/settings.ts`, `side-panel/side-panel.ts`: Updated to await `bootstrapStore` for both singletons before mounting the React tree. The settings entry additionally opens the IDB destination storage and pushes the loaded destinations into the store before render.

## Consequences

Popup, side-panel, and settings now persist and restore state via `chrome.storage.local`. Destinations persist via IndexedDB (loaded on each page open). Templates persist via `chrome.storage.local`. The settings page sections have real add/remove/rename/update handlers. The `bootstrapStore` utility is tested independently and reusable by future entry points (e.g. additional pages that mount a Zustand singleton).
