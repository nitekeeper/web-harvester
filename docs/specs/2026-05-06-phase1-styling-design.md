# Phase 1 Styling — Design Spec

**Date:** 2026-05-06
**Scope:** Pure layout and styling fixes to match the design handoff. No new application logic, no new store fields.

---

## 1. Popup layout

### 1.1 Field labels

Add a small uppercase muted label above each of the three body sections.

- Style: `text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground`
- "DESTINATION" — above `DestinationSelector`
- "TEMPLATE" — above `TemplateSelector`
- "PREVIEW" — above `MarkdownPreview`

Each label + its control is wrapped in a `<div className="flex flex-col gap-1">` so spacing is consistent.

The existing `ToolbarSlot` stays at the top of the body with no label.

### 1.2 Folder icon in DestinationSelector

Inside the shadcn `SelectTrigger`, prepend a `FolderIcon` (14 × 14 px, `text-muted-foreground`) before the `SelectValue`. The trigger already accepts arbitrary children; no changes to shadcn internals required.

When no destinations are configured, the plain-text fallback (`"No destinations configured"`) is unchanged.

### 1.3 Destination path hint

Below the `<Select>` component (outside it, inside the same wrapper `<div>`), render a one-line hint showing `dirHandle.name` from the currently selected `DestinationView`.

- Style: `text-[10.5px] text-muted-foreground font-mono mt-0.5`
- Only rendered when a destination is selected (i.e., `selectedId !== null`)
- The currently selected destination object is looked up from the `destinations` prop

`DestinationSelectorProps` gains no new props — the component receives the full `destinations` list and `selectedId` already, so it can derive the name inline.

### 1.4 File icon in TemplateSelector

Same treatment as destination: prepend a `FileIcon` (14 × 14 px, `text-muted-foreground`) before `SelectValue` inside the `SelectTrigger`.

---

## 2. Settings sidebar

### 2.1 Tab order and labels

New canonical order (top to bottom):

| Position | Tab value      | Display label | Content component                |
| -------- | -------------- | ------------- | -------------------------------- |
| 1        | `destinations` | Destinations  | `DestinationsSection`            |
| 2        | `templates`    | Templates     | `TemplatesSection`               |
| 3        | `metadata`     | Metadata      | (was `general`) `GeneralSection` |
| 4        | `appearance`   | Appearance    | (was `theme`) `ThemeSection`     |
| 5        | `about`        | About         | Inline stub (version string)     |
| 6        | `debug`        | Debug         | `DebugSection`                   |

The `Tab` union type in `Settings.tsx` is updated accordingly. The `TAB_DEFS` constant is replaced with the new order. Default active tab stays `destinations`.

### 2.2 Icons per nav item

Each nav button renders an icon (14 × 14 px) to the left of the label text. Use inline SVG paths matching the design — no new icon file needed since they follow the same `IconSvg` pattern already used throughout the codebase.

| Tab          | Icon description            | SVG path summary                                                                 |
| ------------ | --------------------------- | -------------------------------------------------------------------------------- |
| Destinations | Folder                      | Existing `FolderIcon` from `icons.tsx` or inline                                 |
| Templates    | File                        | Existing `FileIcon` or inline                                                    |
| Metadata     | Three lines (short last)    | `M4 6h16M4 12h16M4 18h10`                                                        |
| Appearance   | Circle + horizontal midline | `circle r=10` + `M12 2a14.5 14.5 0 0 0 0 20M2 12h20`                             |
| About        | Info circle                 | `circle r=10` + `line x1=12 y1=16 x2=12 y2=12` + `line x1=12 y1=8 x2=12.01 y2=8` |
| Debug        | (no icon — tucked-away tab) | —                                                                                |

Active tab: icon gets `text-primary`. Inactive: `text-muted-foreground`.

### 2.3 Sidebar subtitle

Change the branding subtitle from `"Settings"` to `"Settings · v0.1.0"`.

The version string matches `package.json` and is hardcoded until a build-time injection mechanism exists.

### 2.4 About tab content

Minimal inline stub — no separate component file needed:

```text
Web Harvester · v0.1.0
```

Styled as muted body text inside a `p-6` padded div, matching the design's stub treatment for this tab.

### 2.5 Metadata tab content (Phase 1)

The "Metadata" tab renders `GeneralSection` unchanged — it currently holds locale, default destination, and default template settings. The content will be replaced with proper clip-metadata defaults (author, date format, default tags) in Phase 2.

---

## Out of scope for Phase 1

- Properties / frontmatter editor in the popup
- Highlights list in the side panel
- Reader mode controls in the side panel
- Any new application-layer store fields or services

---

## File touch list

| File                                                        | Change                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/presentation/popup/Popup.tsx`                          | Wrap each selector + preview in labelled field group                           |
| `src/presentation/popup/components/DestinationSelector.tsx` | Folder icon in trigger, path hint below                                        |
| `src/presentation/popup/components/TemplateSelector.tsx`    | File icon in trigger                                                           |
| `src/presentation/settings/Settings.tsx`                    | New `TAB_DEFS`, `Tab` type, icon rendering in nav, subtitle update, About stub |
