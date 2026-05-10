# Changelog

All notable changes to Web Harvester are documented here.

## Unreleased

### Fixed

- Popup properties scroll container now uses the same thin styled scrollbar as the markdown preview field
- Default theme is now dark for all new installs and migrated for existing installs that had system theme

---

## [0.1.0] — 2026-05-10

### Added

#### Appearance page

- Theme tile selector (Light / Dark / System)
- Font size slider
- Custom CSS editor with debounced autosave
- Replaced Theme and Metadata tabs with a unified Appearance section in settings

#### Templates page (full redesign)

- Split-pane editor with system templates and user templates
- Template list rail with system badge, rename, and delete actions
- Note name field with live preview and illegal-character validation
- Frontmatter key/value grid with drag-to-reorder
- CodeMirror 6 body editor with locked syntax palette
- Variable picker popover with CSS selector picker integration
- Debounced autosave with in-progress indicator
- System templates: Obsidian Style (with `page.*` variables and YAML frontmatter)
- Dynamic variable resolution for `meta:`, `schema:`, and `selector:` prefixes
- Date filter support in note name patterns (`{{date|date:format}}`)

#### Destinations page (redesign)

- Last-used tracking with timestamp stamp on successful clip
- Primary star toggle
- `lastused` field added to destination storage (DB v2)

#### Plugins settings page

- Replaced Debug tab with a Plugins page in settings sidebar
- Plugin status (active/inactive/error) written to storage after activation
- Summary bar, sort order, and error block in populated state

#### Popup

- Live preview on popup open and template change
- Loading state in properties and preview while previewing
- Properties section with collapsible header and field count badge
- Compact 2-column grid layout for properties editor
- Toolbar slot (empty when no plugins registered)
- CSS picker button — activates element picker on the page
- Click-to-remove individual highlights and clear-all button in highlight mode
- Reader mode toggle
- Destination and template selectors with labels

#### Side panel

- Highlights tab with empty, loading, and populated states
- Reader tab with toggle and settings panel
- Sidebar header with tabs for Highlights / Reader / Clip

#### Reader mode & highlights

- `activateReader` / `deactivateReader` in content script
- Highlight overlay — activate, capture, click-to-remove, clear all
- Background handlers for `start-highlight`, `stop-highlight`, `highlight-mode-exited`
- IPC message types for reader and highlight toggling

#### Icon system

- Full icon audit and alignment to spec (sizes, glyphs)
- Added: Folder, File, Metadata, Appearance, About, Plugin (puzzle piece), WH Logo gem SVG

#### Infrastructure

- MV3 message listener registered before async bootstrap to prevent race condition
- `defuddle/node` bundle used in background service worker for correct ESM resolution
- Article extraction moved to content script (avoids `DOMParser` in service worker)
- Context menus cleared before re-registering on service worker restart
- `createSaveHandler` factory for popup IPC wiring
- Typed IPC message contract for clip-page workflow (`msg_clip`, `msg_preview`)
- `SettingsService` v2 schema with migration from `system` → `dark` theme

#### Design system

- `--wh-*` dark palette (14 tokens) wired to shadcn CSS variables
- 5 → 6 → 8 → 10 px corner radius scale across all UI
- Emerald accent and darkened dark-mode palette
- Type scale aligned to spec — fonts, tracking, line-heights, tabular-nums
- `--wh-mono` token and `.light` theme overrides

### Fixed

- MV3 race condition: listener now registered before async bootstrap
- `defuddle` UMD/ESM interop failure in Chrome MV3 service worker
- Settings loop: separated `onSettingsChanged` (notification) from `onSaveSettings` (write request)
- `DOMParser` accessed via `self` to resolve service worker `ReferenceError`
- FSA permission requested in popup context before clip message
- Default template seeded on first install; fallback to built-in default when id not in storage
- Select components always controlled (empty string fallback prevents uncontrolled warnings)
- HTML extraction via content script instead of background service worker
- Frontmatter delimiters restored and template variables populated in clip output
- Stale closure in template and theme handlers
- Reader exit, highlight remove, select dropdowns, and picker IPC bugs from post-launch audit
- Portal restored in popup to fix Radix Select dropdown clipping
- Property value column alignment with fixed 62px key column
- Toolbar icon enlarged by cropping viewbox to gem bounding box
