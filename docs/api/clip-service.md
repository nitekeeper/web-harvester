# Clip Service API

## Overview

`ClipService` is the application-layer orchestrator for the end-to-end clip flow. It reads the
active browser tab, requests the page HTML from the content script, runs the four clip-flow plugin
hooks (`beforeClip` / `beforeSave` / `afterClip` / `afterSave`), persists the rendered file via an
injected `saveTo` function, and surfaces a user-facing notification on success.

The service stays within the application layer's allowed import surface (only `domain/` and
`shared/`). All infrastructure dependencies are accepted through locally-defined port interfaces
that mirror the relevant slices of their concrete counterparts in `@infrastructure/` and
`@core/hooks`. This is the same pattern used by `SettingsService` (see ADR-001 layer rules).

## Interface

### `IClipService`

```typescript
interface IClipService {
  clip(request: ClipRequest): Promise<ClipResult | ClipAborted>;
}

interface ClipRequest {
  readonly tabId: number;
  readonly destinationId: string;
}

interface ClipResult {
  readonly fileName: string;
  readonly destination: string;
}

interface ClipAborted {
  readonly aborted: true;
  readonly reason: string;
}
```

---

### `clip(request): Promise<ClipResult | ClipAborted>`

Executes the full clip flow for a single request:

1. **Read the active tab** via `tabAdapter.getActiveTab()` — yields `{ id, url, title }`.
2. **Extract HTML** by sending `{ type: 'getHtml' }` to the tab via
   `tabAdapter.sendMessageToTab(tabId, msg)`. The content script is expected to respond with
   `{ html: string }`. A malformed or missing response logs a warning and falls back to an empty
   string so the rest of the flow can still run (a `beforeClip` plugin may substitute richer
   content).
3. **Run `beforeClip`** with the assembled `ClipContent`. Plugin taps may transform the URL,
   HTML, or title — the resulting value is what the rest of the flow uses.
4. **Resolve the destination** via `destinationStorage.getById(request.destinationId)`. If the id
   does not match a stored destination, the service throws `DestinationNotFoundError`.
5. **Render the filename** by substituting `{date}` (current ISO date) and `{title}` (a
   filesystem-safe rendering of the page title) into the destination's `fileNamePattern`.
   Filesystem-unsafe characters (`\ / : * ? " < > |`) in the title are replaced with `-`; an empty
   title falls back to `untitled`.
6. **Run `beforeSave`** with `{ content, fileName, destinationId }`. If any tap returns `false`,
   `clip()` resolves to `{ aborted: true, reason }` without writing.
7. **Persist** via the injected `saveTo(dirHandle, fileName, content, strategy)` function. The
   default conflict strategy is `'suffix'`. The function returns the final filename actually
   written (which may differ from the requested name when suffixing).
8. **Fire `afterClip`** with `{ fileName, destination }` and **`afterSave`** with `{ filePath }`
   (formatted as `<destination-label>/<saved-name>`).
9. **Show a success notification** via `notifications.showNotification({ type, title, message })`.

The returned value distinguishes outcomes:

- `ClipResult` — `{ fileName, destination }` on success.
- `ClipAborted` — `{ aborted: true, reason }` when a `beforeSave` tap short-circuited.
- Throws `DestinationNotFoundError` when the destination id does not resolve.

---

### `DestinationNotFoundError`

Thrown by `clip()` when the requested `destinationId` does not match any persisted destination.

```typescript
class DestinationNotFoundError extends Error {
  constructor(destinationId: string);
}
```

The `name` is `'DestinationNotFoundError'`; the `message` is
`Destination "<id>" was not found`.

## Constructor

### `new ClipService(tabAdapter, destinationStorage, hooks, notifications, saveTo, logger?)`

```typescript
constructor(
  tabAdapter: ITabAdapterPort,
  destinationStorage: IDestinationStoragePort,
  hooks: IClipHooksPort,
  notifications: INotificationAdapterPort,
  saveTo: SaveToFn,
  logger?: ILogger,
);
```

- **`tabAdapter: ITabAdapterPort`** — minimal tab port (`getActiveTab`, `sendMessageToTab`).
  Mirrors the relevant slice of `ITabAdapter` from
  `@infrastructure/adapters/interfaces/ITabAdapter`.
- **`destinationStorage: IDestinationStoragePort`** — minimal destination port (`getById`).
  Mirrors the relevant slice of `IDestinationStorage` from
  `@infrastructure/storage/destinations`.
- **`hooks: IClipHooksPort`** — port exposing the four clip-flow hooks. Defined locally because
  `application/` cannot import from `@core/hooks` and the placeholder `IHookSystem` in
  `@domain/types` exposes hooks only as `unknown`.
- **`notifications: INotificationAdapterPort`** — notification port that accepts a structured
  `NotificationPayload`. Distinct from the infrastructure `INotificationAdapter` (which uses
  `(id, message)` strings) so the application can express intent (`type`) without overloading
  strings.
- **`saveTo: SaveToFn`** — function type matching `saveTo` from `@infrastructure/fsa`. Injected
  rather than imported so this service stays within the application layer's import boundaries.
- **`logger?: ILogger`** — optional scoped logger; defaults to `createLogger('ClipService')`.

### Port shapes

```typescript
interface ITabAdapterPort {
  getActiveTab(): Promise<Tab>;
  sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>;
}

interface IDestinationStoragePort {
  getById(id: string): Promise<Destination | undefined>;
}

interface INotificationAdapterPort {
  showNotification(payload: NotificationPayload): Promise<void>;
}

interface IClipHooksPort {
  readonly beforeClip: { call(value: ClipContent): Promise<ClipContent> };
  readonly afterClip: { call(value: ClipResult): Promise<void> };
  readonly beforeSave: { call(value: SaveRequest): Promise<boolean> };
  readonly afterSave: { call(value: SaveResult): Promise<void> };
}

type SaveToFn = (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
  strategy: string,
) => Promise<string>;

interface NotificationPayload {
  readonly type: 'success' | 'error' | 'info';
  readonly title: string;
  readonly message: string;
}
```

## Usage Example

```typescript
import { ClipService } from '@application/ClipService';
import { saveTo } from '@infrastructure/fsa/fsa';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createHookSystem } from '@core/hooks';
import { createLogger } from '@shared/logger';

const destinations = await createDestinationStorage();
const hooks = createHookSystem();

const clipService = new ClipService(
  tabAdapter, // an ITabAdapter from the chrome adapter
  destinations,
  hooks,
  notificationPort, // adapter that satisfies INotificationAdapterPort
  saveTo,
  createLogger('clip'),
);

const result = await clipService.clip({ tabId: 42, destinationId: 'inbox' });

if ('aborted' in result) {
  console.log('clip aborted:', result.reason);
} else {
  console.log('saved', result.fileName, 'to', result.destination);
}
```

## Notes

- The default conflict strategy passed to `saveTo` is `'suffix'`. The injected `saveTo` is free to
  apply additional logic; the service does not currently consult the user's
  `AppSettings.conflictStrategy`. Passing the resolved strategy through is a future enhancement.
- Filename rendering supports only `{date}` and `{title}` placeholders today. Unsupported
  placeholders are left in the rendered name verbatim so callers or plugins can post-process.
- HTML extraction uses a fixed `{ type: 'getHtml' }` message contract with the content script. A
  malformed response logs a warning and falls back to an empty string rather than throwing — the
  flow continues so plugins can still substitute content via `beforeClip`.
- The `afterSave` payload's `filePath` is rendered as `<destination-label>/<saved-name>` for
  display purposes; it is not a filesystem path and should not be passed to file APIs.
- The service does not coordinate concurrent calls. Two simultaneous clips to the same destination
  may race on the underlying File System Access writes — coordinate externally if the caller can
  invoke `clip()` concurrently.
