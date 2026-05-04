# Settings Storage API

## Overview

Settings storage wraps `chrome.storage.local` with Zod schema validation, single-key merge
writes, explicit versioned backups, and a migration runner. It is designed for the extension's
global settings rather than per-plugin data (use `IPluginStorage` for plugin-scoped keys).
Validation failures fall back gracefully to schema defaults rather than propagating errors.

## Interface

### `createSettingsStorage(adapter: IStorageAdapter)`

```typescript
function createSettingsStorage(adapter: IStorageAdapter): {
  get<T>(schema: z.ZodType<T>): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  backup(version: number): Promise<void>;
  getBackup(version: number): Promise<unknown>;
  runMigrations(migrations: IMigration[]): Promise<void>;
};
```

Creates a settings storage facade over the given `IStorageAdapter`. Returns an object with five
methods.

---

### `get<T>(schema: z.ZodType<T>): Promise<T>`

Reads the settings record from `chrome.storage.local` and validates it against `schema`. If
validation succeeds, returns the parsed value. If validation fails, logs a warning and returns
`schema.parse({})` (i.e. the schema's default value for an empty object).

---

### `set<T>(key: string, value: T): Promise<void>`

Reads the current settings record, merges `{ [key]: value }` into it, and writes the result
back. This is a single-key merge, not a full overwrite — other keys are preserved.

---

### `backup(version: number): Promise<void>`

Saves a snapshot of the current settings under the key `backup_v{version}` in
`chrome.storage.local`. Prunes backups older than three versions automatically (keeps at most
the last 3 backups).

---

### `getBackup(version: number): Promise<unknown>`

Retrieves the backup snapshot stored for the given `version`. Returns `undefined` if no backup
exists for that version.

---

### `runMigrations(migrations: IMigration[]): Promise<void>`

Applies any pending migrations from the supplied list. A migration is pending if its `version`
is greater than the `version` field stored in the current settings record (defaults to `0` if
the field is absent). Pending migrations are sorted by `version` ascending and applied in order.

Before each migration step, the current settings are backed up. If `migration.up` throws, the
pre-migration backup is restored and the error is re-thrown (aborting any remaining migrations).

After all pending migrations succeed, the final migrated data is written back and the highest
version number is logged.

---

### `IMigration`

```typescript
interface IMigration {
  readonly version: number;
  readonly description: string;
  readonly up: (data: unknown) => unknown;
}
```

`up` must be a pure synchronous function — no side effects, no async operations, no storage
calls. It receives the current settings shape and must return the new shape.

## Usage Example

```typescript
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { z } from 'zod';

const settingsStorage = createSettingsStorage(storageAdapter);

// Read with schema validation
const SettingsSchema = z
  .object({
    theme: z.string().default('light'),
    autoSave: z.boolean().default(true),
  })
  .default({});

const settings = await settingsStorage.get(SettingsSchema);
console.log(settings.theme); // 'light'

// Write a single key
await settingsStorage.set('theme', 'dark');

// Run migrations on startup
await settingsStorage.runMigrations([
  {
    version: 1,
    description: 'rename theme key from "colorScheme" to "theme"',
    up(data) {
      const old = data as Record<string, unknown>;
      const { colorScheme, ...rest } = old;
      return { ...rest, theme: colorScheme ?? 'light', version: 1 };
    },
  },
]);

// Manual backup before a risky operation
await settingsStorage.backup(2);
const snap = await settingsStorage.getBackup(2);
```

## Notes

- All settings are stored under the single key `'settings'` in `chrome.storage.local`. Do not
  use `adapter.getLocal('settings')` directly — go through this facade to get validation and
  merge semantics.
- `runMigrations` reads the stored `version` field. Ensure each migration's `up` function stamps
  the new version onto the returned object, or track the version separately.
- Backups are stored under `backup_v{N}` keys. The facade retains at most 3 backups; older ones
  are pruned automatically.
- `set` is not atomic with `get` — avoid concurrent writes without external coordination.
