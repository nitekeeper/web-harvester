// src/presentation/stores/storageSyncMiddleware.ts

import type { StateCreator } from 'zustand';

import { createLogger } from '@shared/logger';

const logger = createLogger('storage-sync');

/**
 * Minimal storage port required by `withStorageSync`. Mirrors the relevant
 * slice of `IStorageAdapter` from the infrastructure layer; defined locally
 * so the presentation layer stays within its allowed import surface (it may
 * not import from `infrastructure/`).
 */
export interface IStorageSyncPort {
  /** Reads the value previously written under `key`, or `undefined`. */
  getLocal(key: string): Promise<unknown>;
  /** Persists `value` under `key`. */
  setLocal(key: string, value: unknown): Promise<void>;
  /** Subscribes to subsequent writes from any browser context. */
  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void;
}

/**
 * Computed type that drops every method-typed property from `T`, leaving only
 * the data fields. Used to type what we serialize into storage so action
 * functions never reach the persistence layer.
 */
type NonFunctionProps<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K];
};

/**
 * Returns a copy of `state` with every function-valued property removed. The
 * stripped object is what we persist into chrome.storage so action methods
 * (which are not serializable) never round-trip.
 */
export function stripFunctions<T extends object>(state: T): NonFunctionProps<T> {
  return Object.fromEntries(
    Object.entries(state).filter(([, v]) => typeof v !== 'function'),
  ) as NonFunctionProps<T>;
}

function persistState<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  state: T,
): void {
  const serializable = stripFunctions(state);
  adapter.setLocal(storageKey, serializable).catch((err) => {
    logger.error('Failed to sync state to storage', err);
  });
}

function loadInitialState<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  apply: (partial: Partial<T>) => void,
): void {
  adapter
    .getLocal(storageKey)
    .then((stored) => {
      if (stored && typeof stored === 'object') {
        apply(stored as Partial<T>);
      }
    })
    .catch((err) => {
      logger.warn('Failed to load initial state from storage', err);
    });
}

function subscribeToExternalChanges<T extends object>(
  adapter: IStorageSyncPort,
  storageKey: string,
  apply: (partial: Partial<T>) => void,
): void {
  adapter.onChanged((changes) => {
    if (!Object.prototype.hasOwnProperty.call(changes, storageKey)) return;
    const change = Reflect.get(changes, storageKey) as
      | { oldValue?: unknown; newValue?: unknown }
      | undefined;
    if (!change) return;
    const { newValue } = change;
    if (newValue && typeof newValue === 'object') {
      apply(newValue as Partial<T>);
    }
  });
}

/**
 * Zustand middleware that mirrors a store's data slice into a chrome.storage
 * key via the supplied adapter. Behaviour:
 *
 * - On every `set()`, the post-mutation state (minus action functions) is
 *   written to `storageKey`.
 * - On creation, the existing storage value (if any) is loaded asynchronously
 *   and merged into the store.
 * - When `storage.onChanged` fires for `storageKey`, the new value is merged
 *   into the store so multiple contexts (popup / side panel / background)
 *   stay in sync.
 *
 * Errors during persistence are logged via the scoped `storage-sync` logger
 * and do not propagate, so a transient storage failure cannot crash the UI.
 *
 * Caveats:
 * - Full-replace updates are intentionally unsupported: the `replace` flag a
 *   caller passes to `set(partial, true)` is coerced to `false` so the
 *   middleware always performs a shallow merge. Callers that need a
 *   replace-style write should mutate every field of the slice explicitly.
 * - Initial state load is asynchronous and unconditional — see the comment on
 *   the `loadInitialState` call below.
 */
export function withStorageSync<T extends object>(storageKey: string, adapter: IStorageSyncPort) {
  return (config: StateCreator<T, [], []>): StateCreator<T, [], []> =>
    (set, get, store) => {
      const wrappedSet: typeof set = (partial, replace) => {
        // `replace` is coerced to `false` so writes always shallow-merge;
        // full-replace updates are intentionally unsupported (see JSDoc).
        set(partial, replace as false);
        persistState(adapter, storageKey, get());
      };
      const state = config(wrappedSet, get, store);
      // Uses raw `set` so external/initial loads don't re-persist.
      const apply = (partial: Partial<T>): void => set(partial, false);
      // Loads initial state asynchronously; mutations applied before this
      // resolves will be overwritten by the persisted value when it arrives.
      loadInitialState<T>(adapter, storageKey, apply);
      subscribeToExternalChanges<T>(adapter, storageKey, apply);
      return state;
    };
}
