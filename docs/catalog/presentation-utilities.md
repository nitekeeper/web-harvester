# Presentation Utilities Catalog

Functions and types in `src/presentation/` that are reusable across presentation components. Organized by sub-module.

---

## `src/presentation/popup/lib/parseFrontmatter.ts`

Utilities for parsing and rebuilding YAML frontmatter in markdown strings.

| Name                                          | Kind      | Description                                                                                                                                                                                                             |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FrontmatterField`                            | Interface | A single key-value pair parsed from YAML frontmatter. Has `readonly key: string` and `readonly value: string`.                                                                                                          |
| `parseFrontmatterFields(markdown)`            | Function  | Parses simple `key: value` YAML frontmatter from a markdown string. Returns `FrontmatterField[]`. Returns empty array when no frontmatter block is present, closing fence is missing, or block has no parseable fields. |
| `rebuildMarkdownWithFields(markdown, fields)` | Function  | Rebuilds a markdown string by replacing its frontmatter block with the supplied fields as `key: value` lines. Returns the original markdown unchanged when it contains no frontmatter block.                            |

---

## `src/presentation/popup/triggerPreview.ts`

Helper that dispatches a live-preview request to the background service worker and updates the popup store.

| Name                              | Kind      | Description                                                                                                                                                                                     |
| --------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMessageSender`                  | Interface | Minimal port interface: `sendMessage(msg: unknown): Promise<unknown>`. Avoids a cross-layer import of `IRuntimeAdapter` into presentation.                                                      |
| `triggerPreview(adapter, logger)` | Function  | Sends a `MSG_PREVIEW` message via `adapter`, clears stale `previewMarkdown` first, and updates the popup store on success. Logs a warning via `logger` when the background returns `ok: false`. |

---

## `src/presentation/hooks/useSaveHandler.ts`

Factory that creates the `onSave` callback wired into the popup and side-panel composition roots.

| Name                                     | Kind      | Description                                                                                                                                                                                                   |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ISendMessagePort`                       | Interface | Minimal port interface: `sendMessage(msg: unknown): Promise<unknown>`. `ChromeAdapter` satisfies this structurally.                                                                                           |
| `createSaveHandler(adapter, preFlight?)` | Function  | Returns a fire-and-forget `onSave` callback that sends `MSG_CLIP` to the background and updates the popup store with the result. Optional `preFlight` async guard runs before the clip (e.g. FSA permission). |

---

## `src/presentation/settings/aboutConfig.ts`

Runtime URL config for the About page.

| Name                 | Kind      | Description                                                                                                                                                                                        |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AboutLinks`         | Interface | External resource links: `gh` (GitHub repo), `issues` (issue tracker), `changelog` (releases page).                                                                                                |
| `AboutLegal`         | Interface | Legal section links: `licenses` (in-extension open-source licenses page).                                                                                                                          |
| `AboutConfig`        | Interface | Full config contract for the About section — combines `AboutLinks` and `AboutLegal`.                                                                                                               |
| `buildAboutConfig()` | Function  | Builds the About page config at runtime. `links` are derived from a hard-coded GitHub base URL. `legal.licenses` is constructed from `window.location.origin` so it works across any extension ID. |

---

## `src/presentation/settings/getAboutDiagnostics.ts`

Diagnostic snapshot for the About page and clipboard bug reports.

| Name                    | Kind      | Description                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AboutDiagnostics`      | Interface | Snapshot shape: `version`, `build`, `channel`, `browser`, `platform` — all `readonly string`.                                                                                                                                                                                                                                                                                                                                |
| `getAboutDiagnostics()` | Function  | Returns a snapshot of version (from `EXTENSION_VERSION`), build and channel (from Vite env vars `VITE_BUILD`/`VITE_CHANNEL`), and browser/platform (from `navigator.userAgentData`, falling back to empty strings on non-Chromium). `VITE_BUILD` is always-present (injected at build time via Vite `define` in `vite.config.ts` and `vitest.config.ts` using `resolveBuildStamp()`; never `undefined` or empty at runtime). |

---

## `src/presentation/popup/components/PropertiesEditor.tsx`

Editable form for YAML frontmatter fields rendered in the popup.

| Name                    | Kind      | Description                                                                                                                                                                                   |
| ----------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PropertiesEditorProps` | Interface | Props: `markdown` (full markdown string) and `onMarkdownChange` (callback receiving rebuilt markdown).                                                                                        |
| `PropertiesEditor`      | Component | Renders a labeled `<input>` for each YAML frontmatter key-value pair. Returns `null` when no frontmatter block is present. Calls `onMarkdownChange` with rebuilt markdown on each field edit. |
