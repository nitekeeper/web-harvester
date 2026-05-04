## ADR-021: Popup UI Shell, I18n Stub, and Plugin Slot Registry

**Status:** Accepted
**Date:** 2026-05-03

## Context

Task 46 introduces the popup React shell — root component, six presentational sub-components (`ToolbarSlot`, `DestinationSelector`, `TemplateSelector`, `MarkdownPreview`, `SaveButton`, `PickerToggle`), the `useFormatMessage` hook, and the `usePluginSlot` registry. Three architectural decisions surfaced while implementing it; each had real tradeoffs that warrant a record.

### Decision 1 — `useFormatMessage` ships as a synchronous stub

The eventual i18n contract is `formatMessage(id, values?)` from `@domain/i18n/i18n` (ADR-018), which lazy-loads locale JSON via `import.meta.glob`. That API is async and has module-level state. The popup composition root is not yet in place, so wiring the real `formatMessage` into a React context now would either require a synchronous wrapper that races the locale load, or block popup mount on a `loadLocale` `await`. Both are worse than running with a deterministic stub during the UI-shell phase.

Options considered:

- **A — Wire `formatMessage` directly:** Each component imports `formatMessage` from `@domain/i18n/i18n`. **Cons:** violates the layer rule (`presentation/` cannot import from `domain/`); also, `formatMessage` returns the id verbatim until `loadLocale` resolves, so the visible behavior is identical to the stub for any first render before the composition root awaits.
- **B — Async `Suspense` boundary that awaits `loadLocale`:** wrap the popup root in a `Suspense` that resolves once locale messages are loaded. **Cons:** introduces async wiring before the popup composition root exists; couples UI-shell tests to a `Suspense` boundary; not necessary for the static layout being built in Task 46.
- **C — Synchronous stub returning ids:** `useFormatMessage()` returns `({ id }) => id`. Components are written against the eventual `fmt({ id, defaultMessage? })` shape so the call sites do not change when the real hook lands. **Pros:** no layer violations; tests assert against literal ids; obvious replacement point in a future task. **Cons:** the rendered popup shows raw message ids until the real hook is wired — acceptable because the composition root that wires it is the natural follow-up.

**Chosen: C.** The stub lives at `src/presentation/hooks/useFormatMessage.ts` and is documented in its own JSDoc as the temporary shim. The future composition root will swap it for a context-backed real implementation without touching call sites.

### Decision 2 — Plugin UI slots use a React context registry, not a domain singleton

`UIRegistry` already exists in `core/` (`createUIRegistry`) and the background composition root holds the singleton. The popup needs the same registry but cannot import from `core/`. Three shapes were considered:

- **A — Re-use the `core/` `IUIRegistry` directly:** Import via the existing application/domain port. **Cons:** the domain registry deals in `{ component: string; order: number; onClick?: () => void }` records, not `ComponentType`; turning component names into actual React components requires a separate component-name → `ComponentType` map kept in sync with plugin registrations. That indirection makes sense for cross-context contributions (popup vs side-panel) but is overkill for the in-tree React-only popup slot.
- **B — Module-level singleton in `presentation/hooks/`:** A global `Map<SlotName, ComponentType[]>` outside React. **Cons:** singleton state breaks tests that mount multiple popup trees in the same vitest worker (`@testing-library/react` cleanup does not reset module state); also fights React's data-flow story.
- **C — `PluginSlotProvider` + `usePluginSlot` context:** registry created per host React tree, passed via context. **Pros:** isolated per render tree (tests start clean); idiomatic React; no layer violations. **Cons:** requires a wiring step in the composition root to mint the registry and have plugins register into it — but that step is needed anyway when bridging the `IUIRegistry` records to actual React components.

**Chosen: C.** `createPluginSlotRegistry()` returns the storage; `PluginSlotProvider` exposes it; `usePluginSlot(slot)` reads from it. The bridge from the domain `IUIRegistry` (string component names) to this presentation registry (real `ComponentType`s) is the responsibility of the popup composition root in a later task.

### Decision 3 — Browser-mode tests use `@testing-library/react` directly, not `vitest-browser-react`

Vitest's `tests/browser/` config runs against real Chromium via the playwright provider. The Vitest docs recommend `vitest-browser-react`'s `render()` for React component tests in browser mode, which exposes async locator-style queries that interop with `expect.element(...)`.

- **A — Add `vitest-browser-react`:** uses async `render()`, `screen.getByText(...).click()` chained promises. **Cons:** another dependency; the project already has `@testing-library/react` installed; the popup tests asserted in this task are pure smoke checks (`querySelector('[data-testid=...]')`) that do not need locator-style waiting.
- **B — Use `@testing-library/react` directly:** synchronous `render()`, queries on `document.querySelector` / `screen.getByText`. **Pros:** no new dependency; identical pattern to mainstream React testing; works fine in browser mode because the real DOM is present and React renders synchronously into it.
- **C — Move popup tests to jsdom (`tests/unit/`):** **Cons:** Radix Select uses portals and computed layout that jsdom approximates poorly; future interaction tests (open dropdown, click item) will need real chromium anyway, so colocating shells now avoids later migration.

**Chosen: B.** Tests in `tests/browser/popup/` import `render`/`cleanup`/`screen` from `@testing-library/react` and call `cleanup()` in `afterEach`. The `react/jsx-dev-runtime` and `react/jsx-runtime` modules are added to `vitest.browser.config.ts` `optimizeDeps.include` so Vite does not re-optimize mid-suite.

## Decision

- **`useFormatMessage`** is a synchronous stub that returns the message `id` verbatim. Components call it as `fmt({ id: 'popup.foo' })` so call sites match the eventual react-intl shape.
- **`usePluginSlot` / `PluginSlotProvider` / `createPluginSlotRegistry`** form a per-tree React context registry. Plugins register `ComponentType` instances into named `SlotName` buckets; consumers read them via `usePluginSlot(slot)`.
- **Browser-mode popup tests** use `@testing-library/react` directly (no `vitest-browser-react`). The browser config opt-includes `react/jsx-dev-runtime` and `react/jsx-runtime` to avoid mid-suite Vite re-optimisation.

## Consequences

- The popup renders raw message ids ("popup.save", "popup.noDestinations", …) until the composition root wires the real i18n hook. This is a deliberate, visible TODO and is documented in the stub's JSDoc.
- Plugin contributions to the popup toolbar require the popup composition root to mint a `PluginSlotRegistry`, mount a `PluginSlotProvider` around the React tree, and bridge each domain `IUIRegistry` entry into a `register(slot, Component)` call. The bridge lives one layer up from this UI shell.
- `tests/browser/popup/` provides smoke coverage of the static popup layout; behavioural tests (interactions, store wiring) belong in later tasks once the composition root injects real state.
- The new presentation slot type `SlotName = 'popup-toolbar' | 'settings-nav' | 'side-panel-toolbar'` is a presentation-layer concern, distinct from the domain `UISlot` union (which is broader and covers cross-context contributions). The two namespaces are intentionally separate; plugins map domain entries into presentation slots in the composition root.
