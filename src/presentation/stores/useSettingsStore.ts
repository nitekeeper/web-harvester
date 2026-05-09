// src/presentation/stores/useSettingsStore.ts

import { create, createStore, type StoreApi } from 'zustand';

import { DEFAULT_TEMPLATE } from '@shared/defaultTemplate';
import type { AppSettings, TemplateConfig } from '@shared/types';

import { type IStorageSyncPort, withStorageSync } from './storageSyncMiddleware';

/**
 * Presentation-layer view of a persisted destination folder. Mirrors the
 * `Destination` shape exposed by `@infrastructure/storage/destinations` so
 * the store can hold the full record without crossing the layer boundary.
 */
export interface DestinationView {
  /** Stable identifier generated when the destination was added. */
  readonly id: string;
  /** Human-friendly display name. */
  readonly label: string;
  /** Opaque browser handle pointing at the user-selected directory. */
  readonly dirHandle: FileSystemDirectoryHandle;
  /** Filename pattern, e.g. `"{date} {title}.md"`. */
  readonly fileNamePattern: string;
  /** Unix milliseconds when the destination was first added. */
  readonly createdAt: number;
  /** Unix milliseconds of the most recent clip saved to this destination. */
  readonly lastUsed?: number;
}

/**
 * Shape of the settings store slice — settings record, destinations list,
 * templates list, and a loading flag, plus the actions that mutate them.
 */
export interface SettingsStoreState {
  /** App-wide settings record (theme, locale, default ids, etc.). */
  settings: AppSettings;
  /** All persisted destination folders the user has registered. */
  destinations: DestinationView[];
  /** All persisted clip templates the user has defined. */
  templates: TemplateConfig[];
  /** Whether settings are currently being loaded from storage. */
  isLoading: boolean;

  /** Replaces the entire settings record. */
  setSettings: (settings: AppSettings) => void;
  /** Merges the supplied partial into the current settings record. */
  updateSettings: (partial: Partial<AppSettings>) => void;
  /** Replaces the destinations list with `destinations`. */
  setDestinations: (destinations: DestinationView[]) => void;
  /** Replaces the templates list with `templates`. */
  setTemplates: (templates: TemplateConfig[]) => void;
  /** Toggles the loading-in-flight flag. */
  setLoading: (loading: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  theme: 'dark',
  locale: 'en',
  defaultDestinationId: null,
  defaultTemplateId: 'default',
};

const STORAGE_KEY = 'settings-state';

function makeSlice(
  set: StoreApi<SettingsStoreState>['setState'],
  get: () => SettingsStoreState,
): SettingsStoreState {
  return {
    settings: DEFAULT_SETTINGS,
    destinations: [],
    templates: [DEFAULT_TEMPLATE],
    isLoading: false,

    setSettings: (settings): void => set({ settings }),
    updateSettings: (partial): void => set({ settings: { ...get().settings, ...partial } }),
    setDestinations: (destinations): void => set({ destinations }),
    setTemplates: (templates): void => set({ templates }),
    setLoading: (loading): void => set({ isLoading: loading }),
  };
}

/**
 * Factory used by tests — builds a fresh `createStore`-style settings store
 * wired to the supplied storage adapter. Production code should use the
 * `useSettingsStore` singleton hook below instead.
 */
export function createSettingsStore(adapter: IStorageSyncPort) {
  return createStore<SettingsStoreState>()(
    withStorageSync<SettingsStoreState>(STORAGE_KEY, adapter)((set, get) => makeSlice(set, get)),
  );
}

/**
 * Singleton React hook variant of the settings store. Created without storage
 * sync because the popup, side panel, and background each instantiate their
 * own hook from the host React tree — wiring storage sync is the
 * responsibility of the entry point that knows which `IStorageAdapter` to
 * pass in (see `createSettingsStore`).
 */
export const useSettingsStore = create<SettingsStoreState>()((set, get) => makeSlice(set, get));
