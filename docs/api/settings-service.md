# Settings Service API

## Overview

`SettingsService` is the application-layer facade for the global app settings record. It wraps an
underlying settings storage port with Zod validation, persists single-key updates, fans out
in-process change notifications to local subscribers, and emits the `onSettingsChanged` plugin hook
so other parts of the system can react.

It is distinct from `createSettingsStorage` in `@infrastructure/storage`:

- `createSettingsStorage` is an infrastructure facade over `chrome.storage.local` with
  versioned backups and migrations — generic over any Zod schema.
- `SettingsService` is the application service that owns the canonical `AppSettings` schema, fires
  the hook, and exposes a typed `get` / `set` / `onChange` surface to consumers.

## Schema

### `AppSettingsSchema`

Zod schema for the global settings record. All fields have defaults so an empty stored object
parses successfully.

```typescript
const AppSettingsSchema = z.object({
  version: z.number().default(1),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  locale: z.string().default('en'),
  defaultDestinationId: z.string().optional(),
  conflictStrategy: z.enum(['overwrite', 'skip', 'suffix']).default('suffix'),
  customThemeTokens: z.record(z.string()).default({}),
  customThemes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        base: z.enum(['light', 'dark']),
        tokens: z.record(z.string()),
        isCustom: z.literal(true),
        createdAt: z.number(),
      }),
    )
    .default([]),
});

type AppSettings = z.infer<typeof AppSettingsSchema>;
```

Unknown keys present in the stored record are stripped (Zod's default object behaviour).

## Interface

### `ISettingsService`

```typescript
interface ISettingsService {
  get(): Promise<AppSettings>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  onChange(handler: (settings: AppSettings) => void): void;
}
```

---

### `get(): Promise<AppSettings>`

Reads the persisted settings record from the storage port (key: `app_settings`) and validates it
against `AppSettingsSchema`. On a missing or `null`/`undefined` record the service substitutes an
empty object before parsing so schema defaults apply uniformly. On a validation failure the service
logs a warning and returns `AppSettingsSchema.parse({})` — consumers always receive a usable
`AppSettings`.

---

### `set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>`

Reads the current settings, merges `{ [key]: value }` into a new record, and persists the merged
object back to storage under the `app_settings` key. The signature is generically typed against
`AppSettings`, so passing a value of the wrong type for a given key is a compile-time error.

After persisting, the service:

1. Logs a debug message naming the changed key.
2. Invokes every `onChange` subscriber synchronously, in registration order, with the new
   settings record.
3. Awaits `hooks.onSettingsChanged.call(updated)` so plugin handlers can react before the
   `set()` promise resolves.

---

### `onChange(handler: (settings: AppSettings) => void): void`

Registers a listener that receives the full `AppSettings` after each successful `set()`. Multiple
listeners are supported; they are invoked in the order they were registered. There is no current
`offChange` API — listener lifetimes are bound to the service instance.

## Constructor

### `new SettingsService(storage, hooks, logger?)`

```typescript
constructor(
  storage: ISettingsStoragePort,
  hooks: ISettingsHooksPort,
  logger?: ILogger,
);
```

- **`storage: ISettingsStoragePort`** — the minimal subset of the settings storage adapter that
  the service requires (`get`, `set`, `onChanged`). The infrastructure facade
  `createSettingsStorage(adapter)` satisfies this port.
- **`hooks: ISettingsHooksPort`** — port exposing `onSettingsChanged.call(settings)`. The
  application layer cannot import `@core/hooks` directly, so this local port mirrors the relevant
  slice of `IHookSystem`.
- **`logger?: ILogger`** — optional scoped logger; defaults to `createLogger('SettingsService')`.

### Port shapes

```typescript
interface ISettingsStoragePort {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void;
}

interface ISettingsHooksPort {
  readonly onSettingsChanged: {
    call(value: AppSettings): Promise<void>;
  };
}
```

## Usage Example

```typescript
import { SettingsService } from '@application/SettingsService';
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { createHookSystem } from '@core/hooks';
import { createLogger } from '@shared/logger';

const storage = createSettingsStorage(storageAdapter);
const hooks = createHookSystem();
const settings = new SettingsService(storage, hooks, createLogger('settings'));

// Read with schema defaults applied
const current = await settings.get();
console.log(current.theme); // 'system'

// Update a single key — typed against AppSettings
await settings.set('theme', 'dark');

// Subscribe to in-process changes
settings.onChange((s) => {
  console.log('settings changed:', s);
});
```

## Notes

- All settings live under the single storage key `app_settings`. Consumers should not read or
  write that key directly — go through this service so validation and hook fan-out happen.
- `set()` is not atomic with `get()` — concurrent writes from the same process race on the
  read-modify-write step. Coordinate externally if multiple writers can collide.
- The `onSettingsChanged` hook receives the full `AppSettings`, not a diff. Plugins that care
  about specific fields should compare against their own previous snapshot.
