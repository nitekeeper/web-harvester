# ADR-018: i18n Architecture

**Status:** Accepted  
**Date:** 2026-05-03

---

## Context

The extension ships with 36 locales. The presentation layer needs to format user-facing
strings in the active locale, substitute runtime values (file names, counts), and apply
plural rules without hardcoding language-specific logic.

Key constraints:

- **MV3 service worker**: no synchronous XHR or `fetch` to load locale files at runtime.
- **Vite bundler**: dynamic `import()` with a template literal (e.g. ``import(`./locales/${locale}.json`)``) is either excluded from the production bundle or requires explicit `@rollup/plugin-dynamic-import-vars`. Static analysis is needed.
- **Plural and gender rules**: a hand-rolled formatter would need to replicate CLDR data. A proven library is preferable.
- **Bundle size**: loading all 36 locale bundles eagerly would add unnecessary weight.

---

## Decision

### Bundle loading: `import.meta.glob`

Locale JSON bundles are discovered via Vite's `import.meta.glob`:

```typescript
const localeModules = import.meta.glob<{ default: MessageRecord }>('./_locales/*/messages.json');
```

This gives Vite a statically-analyzable pattern at build time. Each matched file becomes a
separate lazy chunk — loaded on demand with a standard dynamic import, no HTTP fetch required,
no missing-from-dist problems.

### Message format: ICU via `intl-messageformat`

Messages use ICU MessageFormat syntax (`{name}`, `{count, plural, ...}`, `{gender, select, ...}`).
The `intl-messageformat` library (part of FormatJS) handles formatting and carries CLDR
plural rules for all supported locales.

Alternative considered: a lighter custom formatter. Rejected — CLDR plural rules alone cover
over 200 language families and would require ongoing maintenance.

### Fallback strategy: English

On the first non-English `loadLocale` call, the English bundle is pre-loaded before mutating
module state. `formatMessage` resolves keys as:

1. Active locale entry
2. English fallback entry
3. The message `id` verbatim (so UI degrades gracefully, never crashes)

### Message format: Chrome extension `messages.json`

Bundles use the Chrome extension message format:

```json
{ "settings.title": { "message": "Settings" } }
```

This keeps the locale files compatible with the Chrome extension i18n system (`chrome.i18n`)
for any future migration, while also being parseable by `intl-messageformat` after extracting
the `message` field.

### State management: module-level singleton

`currentLocale`, `activeMessages`, and `englishMessages` are module-level variables. State is
mutated atomically — all async operations (loading active + English bundles) complete before
any variable is reassigned, preventing partial-update races.

---

## Consequences

**Positive:**

- Locale bundles are code-split by Vite — only the active locale chunk is fetched.
- Full CLDR plural/select support via `intl-messageformat` with no custom CLDR maintenance.
- English fallback means untranslated keys degrade gracefully.
- Module-level singleton keeps the API ergonomic (`formatMessage(id)` with no context threading).

**Negative:**

- Module-level state is global — concurrent locale switches in tests require explicit reset
  via `loadLocale('en')` in `beforeEach`.
- `intl-messageformat` adds bundle weight (~20 kB gzipped) compared to a minimal formatter.
- The Chrome `messages.json` format adds one level of nesting (`{ "key": { "message": "..." } }`)
  versus a flat map, requiring a `lookup()` helper that validates the entry shape.

---

## Files

- `src/domain/i18n/i18n.ts` — module implementation
- `src/domain/i18n/_locales/*/messages.json` — locale bundles (en, de, ar stubs; full suite to follow)
