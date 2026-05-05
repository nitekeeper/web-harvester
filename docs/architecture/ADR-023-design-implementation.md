# ADR-023: Design Implementation — Logo, Popup Header, Action Footer, Surface Layouts

**Status:** Accepted
**Date:** 2026-05-04

## Context

A visual design prototype (Claude Design handoff) specified four extension surfaces:
popup, section picker, settings, and side panel. The prototype used a C6 hex-gem SVG
logo, a popup header with theme toggle, an action footer with mode-toggle icons and a
status bar, a sidebar-layout settings page, and a three-tab side panel.

The presentation layer prior to this work had a minimal popup shell (ADR-021) and
composition-rooted settings/side-panel pages (ADR-022) without branded chrome. The
design needed to land while preserving:

- The Clean Architecture import boundaries enforced by `import/no-restricted-paths`.
- The `chrome.*` adapter rule (no `chrome.*` outside `ChromeAdapter` and entry points).
- Existing browser-test selectors (`data-testid="save-button"`).
- jscpd's zero-duplication threshold (icons share visual structure that would otherwise
  trip clone detection).

## Decisions

### Logo

`WHLogo` (`src/presentation/components/WHLogo.tsx`) is a pure SVG component using
`currentColor` with six triangular faces at varying `fillOpacity` values to simulate
depth. Color comes from the parent's Tailwind `text-*` class — no `color` prop. The
component accepts only `size` and `className`. The correct product name is
"Web Harvester" (the prototype contained the typo "Harvestor").

### Shared icon infrastructure

Two shared primitives were extracted to prevent jscpd clone violations and to keep icon
SVGs DRY:

- `IconSvg` (`src/presentation/components/IconSvg.tsx`) — base SVG wrapper sharing the
  14×14 viewBox, `currentColor` stroke, and round-cap attributes.
- `icons.tsx` (`src/presentation/components/icons.tsx`) — shared glyph components
  (`SpinIcon`, `CheckIcon`, `WarnIcon`) consumed by both `StatusBar` and `ActionFooter`.

This module was added during implementation (not in the original plan) once the second
consumer of these glyphs revealed jscpd would otherwise flag them as duplicates.

### StatusBar save states

`StatusBar` (`src/presentation/popup/components/StatusBar.tsx`) defines and exports
`SaveStatus = 'idle' | 'saving' | 'success' | 'error'`. `usePopupStore` imports the
type to avoid type drift between store and component. The component handles the edge
case where `status === 'success'` but `destinationLabel` is `null` by rendering the
`popup.status.saved.simple` locale key (just "Saved") rather than the templated
"Saved to {destination}" form.

### Locale messages

Approximately 25 keys were added to the `en`, `de`, and `ar` message catalogs covering
the popup header (theme menu, settings tooltip), action footer (button label, toggle
tooltips), status bar (idle/saving/success/error variants including the `saved.simple`
fallback), settings sidebar nav, and the side-panel three-tab labels.

### Popup header theme toggle

`PopupHeader` (`src/presentation/popup/components/PopupHeader.tsx`) calls
`updateSettings({ theme })` on the settings store (which syncs to `chrome.storage`)
**and** immediately applies the `.dark` class to `document.documentElement` via
`applyThemeClass()`. This avoids a round-trip through the storage listener before the
page reflects the new theme. `applyThemeClass` currently manages only the `.dark`
class — full theme-plugin parity (system / explicit light) is a follow-up concern.

The theme dropdown uses a switch function (`themeIcon(theme)`) rather than an object
lookup (`THEME_ICONS[theme]`) to satisfy the `security/detect-object-injection` ESLint
rule without an explicit guard.

### ActionFooter replaces standalone SaveButton in Popup

`Popup.tsx` no longer renders `SaveButton` directly. `ActionFooter`
(`src/presentation/popup/components/ActionFooter.tsx`) owns the "Clip Page" button
plus three icon-only mode toggles and the `StatusBar`. The
`data-testid="save-button"` attribute is preserved on the new button so existing
browser-test assertions continue to match. `SaveButton` is kept for use by
`SidePanel` (Clip tab) with the updated "Clip Page" label.

### saveStatus in popup store

`saveStatus` and `saveDestinationLabel` were added to `usePopupStore` alongside
`setSaveStatus`. This allows `StatusBar` and `ActionFooter` to be driven by store
state rather than component-local state, enabling the background save response to
update the UI through the existing storage-sync path.

### onSave and onSettings deferred to composition root

Both `Popup.tsx` and `SidePanel.tsx` pass `NOOP` for `onSave`, and `Popup.tsx` passes
`NOOP` for `onSettings`. The `chrome.runtime` boundary rules (CLAUDE.md + ADR-022)
prohibit `chrome.*` calls outside `ChromeAdapter` and entry points. The composition
roots (`popup/index.tsx`, `side-panel/side-panel.ts`) will wire the real handlers in
the save-workflow follow-up session — `onSettings` will dispatch
`chrome.runtime.openOptionsPage` and `onSave` will dispatch a `runtime.sendMessage`
to the background save handler.

### Settings sidebar layout

`Settings.tsx` switched from a centered horizontal `<TabsList>` to a two-column layout:
a fixed 200 px sidebar (WHLogo + branding + vertical nav) plus a `flex-1` main area.
Tab triggers moved into the vertical sidebar; `<Tabs>` + `<TabsContent>` are kept for
accessibility and keyboard navigation.

### SidePanel three-tab shell

`SidePanel.tsx` wraps a WHLogo header and a custom three-tab bar (Highlights / Reader
stub / Clip). The Clip tab continues to render the existing clip UI with `onSave=NOOP`.
The component uses **conditional rendering** (`activeTab === 'clip' && <ClipTab />`)
rather than Radix `<TabsContent>` — intentional because Radix's `<Tabs>` imposes a
`<TabsList>` + `<TabsTrigger>` structure that conflicts with the custom tab bar
design. ARIA roles (`role="tablist"`, `role="tab"`, `aria-selected`) are applied
directly to the native buttons to preserve screen-reader semantics.

### SidePanel onClose prop

`window.close()` is the default handler; tests pass a mock to avoid browser API errors.
The component remains independently testable without DOM globals.

## Consequences

- `WHLogo` is available to all presentation-layer surfaces (popup, settings,
  side panel).
- The popup has a branded header and a richer footer that will be wired to the save
  workflow in a follow-up task. Save flow wiring is intentionally deferred to keep
  the `chrome.*` boundary clean.
- `SaveButton` label changed from "Save" to "Clip Page" — existing browser-test
  assertions were updated accordingly.
- The settings sidebar layout is a breaking visual change; the functional tab API is
  unchanged.
- Shared icon infrastructure (`IconSvg`, `icons.tsx`) prevents jscpd false-positives
  as more icon-heavy components are added and gives future work a single place to
  extend the icon vocabulary.
- The `popup.status.saved.simple` locale key handles the `null` destination edge case
  without conditional template logic in the component.
- Tab semantics in `SidePanel` diverge from the Radix-based `Settings.tsx` approach.
  The divergence is documented here so future contributors understand the intentional
  asymmetry.
