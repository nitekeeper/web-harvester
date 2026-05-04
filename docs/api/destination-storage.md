# Destination Storage API

## Overview

Destination storage persists the set of user-configured save locations (local folders
selected via the File System Access API). Each destination bundles a `FileSystemDirectoryHandle`
with a display label and a filename pattern template. The backing store is an IndexedDB database
(`web-harvester`, version 1, `destinations` object store). The API is intentionally CRUD-only —
file writing is handled separately by the FSA module.

## Interface

### `createDestinationStorage(idb?): Promise<IDestinationStorage>`

```typescript
async function createDestinationStorage(idb?: IDBFactory): Promise<IDestinationStorage>;
```

Opens (and creates if needed) the `web-harvester` IndexedDB database and returns a ready
`IDestinationStorage` facade. Accepts an optional `IDBFactory` injection point so tests can
supply a fresh in-memory instance from `fake-indexeddb`.

Rejects if the database cannot be opened (e.g. storage quota exceeded, private browsing mode
blocking IndexedDB).

---

### `IDestinationStorage`

#### `add(label, dirHandle, fileNamePattern?): Promise<Destination>`

Persists a new destination and returns the saved record. `fileNamePattern` defaults to
`'{date} {title}.md'` when omitted.

#### `getAll(): Promise<Destination[]>`

Returns every persisted destination in insertion order.

#### `getById(id: string): Promise<Destination | undefined>`

Returns the destination with the given `id`, or `undefined` if no such record exists.

#### `update(id, changes): Promise<void>`

Applies `changes` to the existing destination. Only `label` and `fileNamePattern` may be updated.
If `id` does not match a stored record, the call is a silent no-op.

#### `remove(id: string): Promise<void>`

Deletes the destination with the given `id`. If `id` is not found, the call is a no-op.

---

### `Destination`

```typescript
interface Destination {
  readonly id: string; // UUID (crypto.randomUUID)
  readonly label: string; // display name
  readonly dirHandle: FileSystemDirectoryHandle; // opaque FSA handle
  readonly fileNamePattern: string; // e.g. '{date} {title}.md'
  readonly createdAt: number; // Unix milliseconds
}
```

## Usage Example

```typescript
import { createDestinationStorage } from '@infrastructure/storage/destinations';

const storage = await createDestinationStorage();

// Add a destination
const dest = await storage.add('My Vault', dirHandle, '{date} {title}.md');
console.log(dest.id);

// List all destinations
const all = await storage.getAll();

// Update label
await storage.update(dest.id, { label: 'Work Notes' });

// Remove
await storage.remove(dest.id);

// In tests — inject fake-indexeddb
import FDBFactory from 'fake-indexeddb/build/fakeIndexedDB.js';
const testStorage = await createDestinationStorage(new FDBFactory());
```

## Notes

- `FileSystemDirectoryHandle` objects can be stored directly in IndexedDB. However, re-using a
  stored handle in a new browser session requires the user to re-grant `readwrite` permission.
  Check with `ensureWritable` from the FSA module before writing.
- `update` uses a read-then-write pattern (`get` followed by `put`). It is not atomic — do not
  rely on this operation being race-safe under concurrent writes.
- `id` values are generated with `crypto.randomUUID()` — they are stable for the lifetime of the
  record and are never reassigned.
- `fileNamePattern` is not validated by this module; validation is the responsibility of the
  caller.
