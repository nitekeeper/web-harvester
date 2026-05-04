# Highlight Service API

## Overview

`HighlightService` is the application-layer service that owns the lifecycle of user-created text
highlights for individual web pages. It persists highlights through an injected storage port,
emits the `onHighlight` plugin hook so other parts of the system can react, and exposes a small
CRUD surface to consumers.

The service stays within the application layer's allowed import surface (only `domain/` and
`shared/`). All infrastructure dependencies are accepted through locally-defined port interfaces
that mirror the relevant slices of their concrete counterparts in `@infrastructure/` and
`@core/hooks`. This is the same pattern used by `ClipService` and `SettingsService` (see ADR-001
layer rules).

## Storage layout

Highlights are persisted as `Highlight[]` arrays under per-URL keys:

| Key                | Value         | Purpose                                      |
| ------------------ | ------------- | -------------------------------------------- |
| `highlights:{url}` | `Highlight[]` | The bucket of highlights for a given URL.    |
| `highlight_index`  | `string[]`    | URLs that currently have a non-empty bucket. |

`highlight_index` lets `removeHighlight(id)` find which bucket owns a highlight without scanning
all storage keys.

## Types

### `Highlight`

```typescript
interface Highlight {
  readonly id: string;
  readonly url: string;
  readonly text: string;
  readonly color: string;
  readonly xpath: string;
  readonly createdAt: number;
}
```

A single text highlight on a web page. `id` is service-generated; `xpath` locates the highlighted
node within the DOM so it can be re-applied on subsequent visits; `color` matches one of the
user-configured palette entries (defaults to `'yellow'`); `createdAt` is a `Date.now()` timestamp.

## Interface

### `IHighlightService`

```typescript
interface IHighlightService {
  addHighlight(url: string, text: string, xpath: string, color?: string): Promise<Highlight>;
  getHighlightsForUrl(url: string): Promise<Highlight[]>;
  removeHighlight(id: string): Promise<void>;
  clearHighlightsForUrl(url: string): Promise<void>;
}
```

---

### `addHighlight(url, text, xpath, color?): Promise<Highlight>`

Creates a new `Highlight` record, appends it to the URL's bucket, persists the updated bucket,
ensures `url` is present in `highlight_index`, then fires `hooks.onHighlight.call(highlight)` so
plugins can react. Returns the freshly-created highlight (with generated `id` and `createdAt`).

`color` defaults to `'yellow'` when omitted.

---

### `getHighlightsForUrl(url): Promise<Highlight[]>`

Reads the persisted `Highlight[]` bucket for `url`. Returns an empty array on a missing or
non-array record so callers always receive a usable list.

---

### `removeHighlight(id): Promise<void>`

Removes a single highlight by id by walking the `highlight_index` URL list and updating the first
bucket that contains `id`. The index lookup avoids a full storage scan; if the id is not found
in any indexed URL the call logs a warning and resolves without persisting.

---

### `clearHighlightsForUrl(url): Promise<void>`

Removes the entire `highlights:{url}` bucket from storage. Does not currently prune the URL from
`highlight_index` — a cleared URL will simply yield an empty array on subsequent reads.

## Constructor

### `new HighlightService(storage, hooks, logger?)`

```typescript
constructor(
  storage: IStorageAdapterPort,
  hooks: Pick<IHighlightHooksPort, 'onHighlight'>,
  logger?: ILogger,
);
```

- **`storage: IStorageAdapterPort`** — minimal storage port (`getLocal`, `setLocal`,
  `removeLocal`). Mirrors the relevant slice of `IStorageAdapter` from
  `@infrastructure/adapters/interfaces/IStorageAdapter`.
- **`hooks: Pick<IHighlightHooksPort, 'onHighlight'>`** — port exposing the `onHighlight` hook.
  Defined locally because `application/` cannot import from `@core/hooks` and the placeholder
  `IHookSystem` in `@domain/types` exposes hooks only as `unknown`.
- **`logger?: ILogger`** — optional scoped logger; defaults to `createLogger('HighlightService')`.

### Port shapes

```typescript
interface IStorageAdapterPort {
  getLocal(key: string): Promise<unknown>;
  setLocal(key: string, value: unknown): Promise<void>;
  removeLocal(key: string): Promise<void>;
}

interface IHighlightHooksPort {
  readonly onHighlight: {
    tap(name: string, fn: (h: Highlight) => void): void;
    call(h: Highlight): Promise<void>;
  };
}
```

## Usage Example

```typescript
import { HighlightService } from '@application/HighlightService';
import { createHookSystem } from '@core/hooks';
import { createLogger } from '@shared/logger';

const hooks = createHookSystem();
const highlights = new HighlightService(storageAdapter, hooks, createLogger('highlights'));

// Add a highlight on the active page
const created = await highlights.addHighlight(
  'https://example.com/article',
  'Important text',
  '/html/body/main/article/p[3]',
  'yellow',
);

// Read all highlights for a URL
const all = await highlights.getHighlightsForUrl('https://example.com/article');

// Remove one by id
await highlights.removeHighlight(created.id);

// Or clear the whole URL bucket
await highlights.clearHighlightsForUrl('https://example.com/article');
```

## Notes

- The service does not coordinate concurrent calls. Two simultaneous `addHighlight()` calls for
  the same URL race on the read-modify-write of the bucket — coordinate externally if needed.
- `removeHighlight()` relies on `highlight_index` to find the owning URL; an id that exists in
  storage but whose URL is missing from the index will not be removed. The index is maintained
  by `addHighlight()`, so this can only diverge if storage is mutated outside the service.
- Generated ids use `Math.random()` purely as a same-millisecond uniqueness disambiguator; they
  are not security tokens.
- `clearHighlightsForUrl()` does not prune the URL from `highlight_index` today. This is harmless
  (subsequent reads return `[]`) but means the index can grow unbounded over many cleared URLs.
  A future enhancement could rebuild the index opportunistically.
