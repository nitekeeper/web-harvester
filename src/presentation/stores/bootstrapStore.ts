// src/presentation/stores/bootstrapStore.ts
//
// Generic async utility that wires chrome.storage sync to an existing Zustand
// singleton. Singleton stores in this codebase are created without
// `withStorageSync` so the entry point that owns the adapter (popup, settings,
// side-panel — see ADR-022) can plug in the concrete `IStorageSyncPort` at
// boot time.

import type { StoreApi } from 'zustand';

import { createLogger } from '@shared/logger';

import { extractKeyChange, type IStorageSyncPort, stripFunctions } from './storageSyncMiddleware';

const logger = createLogger('bootstrap-store');

/**
 * Optional configuration for {@link bootstrapStore}.
 */
interface BootstrapStoreOptions<T extends object> {
  /**
   * Returns the slice of `state` that should be persisted to storage. When
   * omitted, every non-function property is persisted via `stripFunctions`.
   * Use this to drop fields that are not serializable to chrome.storage
   * (e.g. `FileSystemDirectoryHandle` objects).
   */
  serialize?: (state: T) => Partial<T>;
}

/**
 * Loads the persisted slice for `storageKey` and applies it to `store` via
 * the raw `setState` (so the persistence subscriber added later does not
 * re-write what we just loaded).
 */
async function loadInitialState<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  store: StoreApi<T>,
): Promise<void> {
  try {
    const stored = await adapter.getLocal(storageKey);
    if (stored && typeof stored === 'object') {
      store.setState(stored as Partial<T>);
    }
  } catch (err: unknown) {
    logger.warn('initial load failed', err);
  }
}

/**
 * Subscribes to `store` and persists each post-mutation state to `storageKey`
 * via `adapter.setLocal`. The supplied flag closure (`isApplyingExternal`)
 * lets the caller suppress the subscriber while applying an external change,
 * so we do not echo a value we just received via `onChanged`.
 */
function wirePersistence<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  store: StoreApi<T>,
  serialize: (state: T) => Partial<T>,
  isApplyingExternal: () => boolean,
): void {
  store.subscribe((state) => {
    if (isApplyingExternal()) return;
    const payload = serialize(state);
    adapter.setLocal(storageKey, payload).catch((err: unknown) => {
      logger.error('persist failed', err);
    });
  });
}

/**
 * Subscribes to `adapter.onChanged` and applies external updates for
 * `storageKey` to `store`. Toggles the `setApplying` flag synchronously
 * around the `setState` call so the persistence subscriber added by
 * {@link wirePersistence} skips the resulting change.
 */
function wireExternalSync<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  store: StoreApi<T>,
  setApplying: (applying: boolean) => void,
): void {
  adapter.onChanged((changes) => {
    const partial = extractKeyChange<T>(changes, storageKey);
    if (!partial) return;
    setApplying(true);
    try {
      store.setState(partial, false);
    } finally {
      setApplying(false);
    }
  });
}

/**
 * Wires chrome.storage sync to the existing Zustand singleton `store`. Loads
 * the persisted slice for `storageKey` first (so the React tree never renders
 * empty when storage already has data), then subscribes to `store` for
 * outbound persistence and to `adapter.onChanged` for inbound updates.
 *
 * Resolves once initial hydration completes (whether it succeeded or failed —
 * subscribers are wired in either case so subsequent writes still flow).
 */
export async function bootstrapStore<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  store: StoreApi<T>,
  options?: BootstrapStoreOptions<T>,
): Promise<void> {
  await loadInitialState(adapter, storageKey, store);
  let applyingExternal = false;
  const serialize: (state: T) => Partial<T> =
    options?.serialize ?? ((state): Partial<T> => stripFunctions(state) as unknown as Partial<T>);
  wirePersistence(adapter, storageKey, store, serialize, () => applyingExternal);
  wireExternalSync(adapter, storageKey, store, (applying) => {
    applyingExternal = applying;
  });
}
