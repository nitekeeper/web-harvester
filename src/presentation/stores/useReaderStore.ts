import { create, createStore, type StoreApi } from 'zustand';

import { defaultReaderSettings, type ReaderSettings } from '@application/ReaderService';

import { type IStorageSyncPort, withStorageSync } from './storageSyncMiddleware';

const STORAGE_KEY = 'reader-settings';

/**
 * State shape for the reader settings store. Settings are persisted to
 * chrome.storage via `bootstrapStore` in the composition root so they survive
 * panel reloads.
 */
export interface ReaderStoreState {
  /** Current reader display settings (font, layout, theme). */
  settings: ReaderSettings;
  /** Merges a partial patch into the current settings. */
  setSettings: (patch: Partial<ReaderSettings>) => void;
}

/**
 * Builds the full reader state slice — initial data values plus the actions
 * that mutate them. Both the singleton hook and the test factory delegate to
 * this function so the initial state and reducers are never duplicated.
 */
function makeReaderSlice(set: StoreApi<ReaderStoreState>['setState']): ReaderStoreState {
  return {
    settings: defaultReaderSettings(),
    setSettings: (patch): void => set((s) => ({ settings: { ...s.settings, ...patch } })),
  };
}

/**
 * Test factory — creates a fresh store wired to the supplied storage adapter.
 * Production code uses the {@link useReaderStore} singleton instead.
 */
export function createReaderStore(adapter: IStorageSyncPort) {
  return createStore<ReaderStoreState>()(
    withStorageSync<ReaderStoreState>(STORAGE_KEY, adapter)((set) => makeReaderSlice(set)),
  );
}

/**
 * Singleton reader settings store. Bootstrap with chrome.storage via
 * `bootstrapStore(adapter, 'reader-settings', useReaderStore)` in the
 * composition root before mounting the React tree.
 */
export const useReaderStore = create<ReaderStoreState>()((set) => makeReaderSlice(set));
