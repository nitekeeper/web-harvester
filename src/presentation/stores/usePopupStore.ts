// src/presentation/stores/usePopupStore.ts

import { create, createStore, type StoreApi } from 'zustand';

import type { SaveStatus } from '@presentation/popup/components/StatusBar';

import { type IStorageSyncPort, withStorageSync } from './storageSyncMiddleware';

/**
 * Lightweight tab descriptor used by the popup store. Mirrors the relevant
 * subset of the infrastructure `Tab` shape; defined locally so the
 * presentation layer does not need to import from `infrastructure/`.
 */
export interface PopupTab {
  /** Numeric tab id assigned by the browser. */
  readonly id: number;
  /** Current page URL. */
  readonly url: string;
  /** Current page title. */
  readonly title: string;
}

/**
 * Output of the element picker overlay — the XPaths the user marked as
 * excluded from clip extraction. Kept as `readonly` arrays so consumers
 * cannot mutate the persisted picker result.
 */
export interface PickerResult {
  /** XPath strings for DOM nodes the user excluded via the picker. */
  readonly excludedXPaths: readonly string[];
}

/**
 * Shape of the popup state slice — UI-local data plus the actions that
 * mutate it. Persisted into chrome.storage by `withStorageSync` so the
 * popup, side panel, and background can stay in sync across contexts.
 */
export interface PopupStoreState {
  /** Active browser tab the popup is operating on, or `null` until resolved. */
  activeTab: PopupTab | null;
  /** Currently selected destination id, or `null` if none chosen. */
  selectedDestinationId: string | null;
  /** Currently selected template id, or `null` if none chosen. */
  selectedTemplateId: string | null;
  /** Whether the element picker overlay is currently active. */
  isPickerActive: boolean;
  /** Most recent picker output, or `null` if the picker has not been run. */
  pickerResult: PickerResult | null;
  /** Markdown rendered for the live preview pane. */
  previewMarkdown: string;
  /** Whether a save operation is in flight. */
  isSaving: boolean;
  /** Last error message to surface in the UI, or `null` when clean. */
  error: string | null;
  /** Current save-flow status shown by the StatusBar. */
  saveStatus: SaveStatus;
  /** Label of the destination last written to; used by the StatusBar success message. */
  saveDestinationLabel: string | null;
  /** Whether reader mode is currently active for the active tab. Synced across popup and side panel. */
  isReaderActive: boolean;

  /** Sets the active tab descriptor. */
  setActiveTab: (tab: PopupTab | null) => void;
  /** Selects a destination by id. */
  setSelectedDestinationId: (id: string | null) => void;
  /** Selects a template by id. */
  setSelectedTemplateId: (id: string | null) => void;
  /** Toggles the element picker overlay's active state. */
  setPickerActive: (active: boolean) => void;
  /** Stores the picker output. */
  setPickerResult: (result: PickerResult | null) => void;
  /** Updates the live preview markdown. */
  setPreviewMarkdown: (markdown: string) => void;
  /** Toggles the saving-in-flight flag. */
  setSaving: (saving: boolean) => void;
  /** Sets a UI-visible error message. */
  setError: (error: string | null) => void;
  /** Clears any UI-visible error message. */
  clearError: () => void;
  /** Sets the save-flow status and optionally the destination label. */
  setSaveStatus: (status: SaveStatus, destinationLabel?: string) => void;
  /** Toggles reader mode active state. */
  setReaderActive: (active: boolean) => void;
}

function makeSlice(set: StoreApi<PopupStoreState>['setState']): PopupStoreState {
  return {
    activeTab: null,
    selectedDestinationId: null,
    selectedTemplateId: null,
    isPickerActive: false,
    pickerResult: null,
    previewMarkdown: '',
    isSaving: false,
    error: null,
    saveStatus: 'idle' as SaveStatus,
    saveDestinationLabel: null,
    isReaderActive: false,

    setActiveTab: (activeTab): void => set({ activeTab }),
    setSelectedDestinationId: (selectedDestinationId): void => set({ selectedDestinationId }),
    setSelectedTemplateId: (selectedTemplateId): void => set({ selectedTemplateId }),
    setPickerActive: (isPickerActive): void => set({ isPickerActive }),
    setPickerResult: (pickerResult): void => set({ pickerResult }),
    setPreviewMarkdown: (previewMarkdown): void => set({ previewMarkdown }),
    setSaving: (isSaving): void => set({ isSaving }),
    setError: (error): void => set({ error }),
    clearError: (): void => set({ error: null }),
    setSaveStatus: (status, destinationLabel): void =>
      set({ saveStatus: status, saveDestinationLabel: destinationLabel ?? null }),
    setReaderActive: (isReaderActive): void => set({ isReaderActive }),
  };
}

const STORAGE_KEY = 'popup-state';

/**
 * Factory used by tests — builds a fresh `createStore`-style popup store
 * wired to the supplied storage adapter. Production code should use the
 * `usePopupStore` singleton hook below instead.
 */
export function createPopupStore(adapter: IStorageSyncPort) {
  return createStore<PopupStoreState>()(
    withStorageSync<PopupStoreState>(STORAGE_KEY, adapter)((set) => makeSlice(set)),
  );
}

/**
 * Singleton React hook variant of the popup store. Created without storage
 * sync because the popup, side panel, and background each instantiate their
 * own hook from the host React tree — wiring storage sync is the
 * responsibility of the entry point that knows which `IStorageAdapter` to
 * pass in (see `createPopupStore`).
 */
export const usePopupStore = create<PopupStoreState>()((set) => makeSlice(set));
