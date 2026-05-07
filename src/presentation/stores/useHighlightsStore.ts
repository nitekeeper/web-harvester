import { create } from 'zustand';

import type { Highlight } from '@application/HighlightService';

/**
 * State shape for the side-panel highlights store. Not persisted to
 * chrome.storage — loaded on demand by the side-panel composition root
 * from the `highlights:{url}` storage key written by `HighlightService`.
 */
export interface HighlightsStoreState {
  /** Highlights for the currently active page URL, in insertion order. */
  highlights: Highlight[];
  /** True while the composition root is fetching highlights from storage. */
  isLoading: boolean;
  /** Replaces the highlights array (used by the composition root after load). */
  setHighlights: (highlights: Highlight[]) => void;
  /** Sets the loading flag. */
  setLoading: (loading: boolean) => void;
}

/**
 * Singleton store for the highlights shown in the side panel. Call
 * `setHighlights` from the side-panel composition root once highlights have
 * been read from chrome.storage.
 */
export const useHighlightsStore = create<HighlightsStoreState>()((set) => ({
  highlights: [],
  isLoading: false,
  setHighlights: (highlights) => set({ highlights }),
  setLoading: (isLoading) => set({ isLoading }),
}));
