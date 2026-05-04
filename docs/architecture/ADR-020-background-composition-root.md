# ADR-020: Background Service Worker as Composition Root

**Status:** Accepted
**Date:** 2026-05-03

## Context

ADR-001 places `presentation/` in the layered architecture with the explicit rule that it imports from `application/` and `shared/` only. ADR-015 enforces that rule via `import/no-restricted-paths`.

However, every Chrome MV3 extension needs exactly one composition root: a single file that wires concrete adapters, application services, the plugin registry, and the six plugins together at startup. In MV3 that file is the background service worker — the only context guaranteed to run on extension load and survive popup/side-panel lifecycle changes. The composition root must, by definition, import from every layer it composes:

- `infrastructure/` — `ChromeAdapter`, `createSettingsStorage`, `createDestinationStorage`, `saveTo`, the `TYPES` token map.
- `core/` — `createRootContainer`, `createHookSystem`, `createPluginRegistry`, `createPluginStorage`, `createUIRegistry`.
- `plugins/` — the six concrete plugin classes (`ThemePlugin`, `ClipperPlugin`, `TemplatePlugin`, `HighlighterPlugin`, `ReaderPlugin`, `SettingsPlugin`).
- `domain/` — the `compileTemplate` function injected into `TemplateService`.

Three options were considered:

- **Option A — move the composition root out of `presentation/`:** create a new top-level layer (`bootstrap/` or similar) that owns the SW entry. Pros: keeps `presentation/` pure. Cons: the SW is a presentation-layer concern (it is one of the four presentation contexts, alongside popup/settings/side-panel); a fourth top-level layer is over-engineering and the new layer would have the same import surface anyway.
- **Option B — carve out the SW entry file in ESLint:** keep the composition root in `presentation/background/background.ts` and add a narrow file-level rule override that disables `import/no-restricted-paths` for that one file (and parallel popup/settings/side-panel entry points if and when they need it). Pros: localized exception with a documented reason; matches the natural layout of a Chrome extension; the carve-out is visible in `eslint.config.ts` so reviewers can see the trade-off. Cons: relaxes one rule for a single file.
- **Option C — push wiring into a "composition" file inside `infrastructure/`:** infrastructure may import from `application/` and `domain/`, and we already store concrete services there. Pros: no ESLint change needed. Cons: infrastructure cannot import from `core/` or `plugins/` either, so the composition root cannot live there without similar carve-outs; misrepresents the SW entry as an infrastructure concern; tooling (Vite + the web-extension plugin) reads the SW path from the manifest, which expects a presentation-style layout.

Option B was chosen. The composition root lives in `presentation/background/background.ts`, and `eslint.config.ts` carves out that file with overrides that allow it to import from `infrastructure/`, `core/`, `domain/`, and `plugins/`.

## Decision

The Chrome MV3 background service worker is the single composition root. It lives at `src/presentation/background/background.ts` and:

- imports `reflect-metadata` first;
- creates one `ChromeAdapter` instance and binds it to all nine adapter tokens via `createRootContainer`;
- creates `IHookSystem`, `IUIRegistry`, settings storage, destination storage, and instantiates the five application services (`SettingsService`, `TemplateService`, `HighlightService`, `ReaderService`, `ClipService`) with their constructor-injected ports;
- binds those services and the registry/hook/UI singletons into the container under their `TYPES.*` tokens;
- creates the `PluginRegistry` with a `contextFactory` that mints a fresh `IPluginContext` per plugin (with a namespaced `IPluginStorage`), then registers and activates the six plugins;
- wires `onInstalled` (settings migrations), context menus (`clip-page`, `clip-selection`), and keyboard commands.

`eslint.config.ts` adds a file-level override for `src/presentation/background/**/*.ts` that disables `import/no-restricted-paths` for that path only. The `chrome.*` and `console.*` bans remain in force; the only relaxation is the cross-layer import rule.

## Consequences

The composition root is co-located with the other presentation surfaces (popup, settings, side-panel) where Chrome extension authors expect to find it, and the manifest's `service_worker` entry resolves naturally. The narrow ESLint override is documented here and in `eslint.config.ts` itself. Other presentation entry points that need to compose layers (popup bootstrap, settings page bootstrap, side-panel bootstrap) may extend the same override path-glob; the carve-out remains scoped to entry files only — UI components and presentation logic still cannot reach across layers.
