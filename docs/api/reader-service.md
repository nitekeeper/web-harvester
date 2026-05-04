# Reader Service API

## Overview

`ReaderService` is the application-layer service that toggles a clean,
distraction-free reader mode on a browser tab by injecting and removing a
fixed CSS stylesheet. It tracks which tabs currently have reader mode active
so a single `toggle()` method can decide whether to inject or remove, and it
remembers the most recently toggled tab so consumers (e.g. the popup) can
read a snapshot of "is reader mode on for the current/last tab?".

The service stays within the application layer's allowed import surface
(only `domain/` and `shared/`). The browser tab integration is accepted
through a locally-defined port interface (`IReaderTabAdapterPort`) that
describes the port shape required by `ReaderService` — `insertCSS` and
`removeCSS`. `removeCSS` will be added to `ITabAdapter` and `ChromeAdapter`
when this service is wired up in the composition root. This is the same
pattern used by `ClipService`, `SettingsService`, and `HighlightService`
(see ADR-001 layer rules).

The injected CSS is exported separately as `READER_CSS` from
`@domain/reader/reader-styles` so it remains pure data with no infrastructure
dependencies.

## Types

### `ReaderState`

```typescript
interface ReaderState {
  readonly isActive: boolean;
  readonly tabId: number | undefined;
}
```

Snapshot of the reader-mode state for the most recently toggled tab.
`tabId` is `undefined` until `toggle()` has been called at least once;
`isActive` reflects whether reader mode is currently enabled on that tab.

## Interface

### `IReaderService`

```typescript
interface IReaderService {
  toggle(tabId: number): Promise<void>;
  isActive(tabId: number): boolean;
  getState(): ReaderState;
}
```

---

### `toggle(tabId): Promise<void>`

Toggles reader mode for the given tab. On the first call for `tabId` the
service calls `tabAdapter.insertCSS(tabId, READER_CSS)` and adds the tab to
the internal active set. On the next call for the same `tabId` it calls
`tabAdapter.removeCSS(tabId, READER_CSS)` and removes the tab from the set.

Always remembers `tabId` as the "most recently toggled tab" so a subsequent
`getState()` reflects the latest action.

---

### `isActive(tabId): boolean`

Returns whether reader mode is currently active for `tabId`. Returns `false`
for any tab that has never been toggled or whose latest action was a
deactivation.

---

### `getState(): ReaderState`

Returns the state of the most recently toggled tab. Before any call to
`toggle()`, returns `{ isActive: false, tabId: undefined }`. After the first
`toggle()`, `tabId` is set to that tab id and `isActive` reflects whether
reader mode is currently active on it.

## Constructor

### `new ReaderService(tabAdapter, logger?)`

```typescript
constructor(
  tabAdapter: IReaderTabAdapterPort,
  logger?: ILogger,
);
```

- **`tabAdapter: IReaderTabAdapterPort`** — minimal tab port with
  `insertCSS(tabId, css)` and `removeCSS(tabId, css)`. `removeCSS` will be
  added to `ITabAdapter` and `ChromeAdapter` when this service is wired up
  in the composition root.
- **`logger?: ILogger`** — optional scoped logger; defaults to
  `createLogger('ReaderService')`.

### Port shape

```typescript
interface IReaderTabAdapterPort {
  insertCSS(tabId: number, css: string): Promise<void>;
  removeCSS(tabId: number, css: string): Promise<void>;
}
```

## Usage Example

```typescript
import { ReaderService } from '@application/ReaderService';
import { createLogger } from '@shared/logger';

const reader = new ReaderService(tabAdapter, createLogger('reader'));

// Toggle reader mode on the active tab
const tab = await tabAdapter.getActiveTab();
await reader.toggle(tab.id);

// Check whether the current tab has reader mode on
if (reader.isActive(tab.id)) {
  // ...
}

// Read the snapshot for the most-recently-toggled tab (e.g. for the popup)
const { isActive, tabId } = reader.getState();
```

## Notes

- State is held in memory on the service instance — it is not persisted
  across service-worker restarts. Consumers that need persistence should
  either re-toggle on activation events or layer their own persistence on
  top of `getState()`.
- The service does not coordinate concurrent calls. Two simultaneous
  `toggle()` calls for the same tab race on the active-set membership
  check — coordinate externally if needed.
- The injected CSS is the single `READER_CSS` constant from
  `@domain/reader/reader-styles`; per-user typography preferences live on
  `ReaderSettings` in `@domain/reader/reader.ts` and are not yet applied by
  this service.
