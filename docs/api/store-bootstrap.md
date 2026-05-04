# Store Bootstrap API

## Overview

`bootstrapStore` is the presentation-layer utility that wires `chrome.storage.local`
sync to an existing Zustand singleton store. The singleton stores in this codebase
(`useSettingsStore`, `usePopupStore`) are created without `withStorageSync` because
each UI page (popup, settings, side-panel) wants to control which adapter is
injected. The page-level composition root awaits `bootstrapStore` for each store
before mounting the React tree (see ADR-022).

The utility:

- Loads the persisted slice from storage and applies it to the store via raw `setState`
  (so the persistence subscriber added next does not echo what we just loaded).
- Subscribes to the store; on every change it calls the optional `serialize` function
  (or `stripFunctions` by default) and writes the result via `adapter.setLocal`.
- Subscribes to `adapter.onChanged`; on incoming external updates for the same key
  it sets a synchronous `applyingExternal` flag, applies the change, and clears the
  flag — so the persistence subscriber skips the resulting set and we don't echo
  external changes back to storage.

## Interface

### `bootstrapStore<T>(adapter, storageKey, store, options?): Promise<void>`

```typescript
async function bootstrapStore<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  store: StoreApi<T>,
  options?: BootstrapStoreOptions<T>,
): Promise<void>;
```

Wires `chrome.storage` sync to the supplied Zustand singleton. Resolves once
initial hydration completes (whether it succeeded or failed — subscribers are
wired in either case so subsequent writes still flow even after a transient
load error).

---

### `BootstrapStoreOptions<T>`

```typescript
interface BootstrapStoreOptions<T extends object> {
  serialize?: (state: T) => Partial<T>;
}
```

`serialize` returns the slice of `state` that should be persisted to storage.
When omitted, every non-function property is persisted via `stripFunctions`.

Use this option to drop fields that are not serializable by `chrome.storage.local`
(for example, `FileSystemDirectoryHandle` objects in the settings store —
those are persisted separately via IndexedDB).

## Usage Example

```typescript
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

const adapter = new ChromeAdapter();

// Wire both singletons before mounting the React tree.
await Promise.all([
  bootstrapStore(adapter, 'settings-state', useSettingsStore, {
    // Drop `destinations` (FSA handles can't round-trip through chrome.storage)
    // and `isLoading` (UI transient).
    serialize: (s) => ({ settings: s.settings, templates: s.templates }),
  }),
  bootstrapStore(adapter, 'popup-state', usePopupStore),
]);

// Render the React tree — first paint sees the persisted values.
```

## Notes

- `bootstrapStore` is paired with the existing `withStorageSync` middleware. They
  share `extractKeyChange` from `storageSyncMiddleware.ts` to narrow `onChanged`
  payloads. Choose `bootstrapStore` for singletons that need adapter injection at
  boot time; choose `withStorageSync` for tests/factories that build a fresh
  `createStore`-style instance with the adapter known up front.
- The `applyingExternal` flag is intentionally synchronous (a closed-over `let`)
  so the suppression covers exactly the `setState` call triggered by the
  inbound change.
- Persistence failures are logged via the scoped `bootstrap-store` logger and do
  not propagate, so a transient storage failure cannot crash the UI.
