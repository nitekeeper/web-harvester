import { create } from 'zustand';

import type { SupportedLocale } from '@shared/constants';

/**
 * State shape for the locale store. Holds the locale whose bundle is
 * currently loaded — updated by `bootstrapLocale` after each successful
 * `loadLocale` call so consumers re-render exactly once with correct strings.
 */
export interface LocaleStoreState {
  /** The locale whose bundle is currently in memory. */
  locale: SupportedLocale;
  /** Switches the active locale; call only after `loadLocale` resolves. */
  setLocale: (locale: SupportedLocale) => void;
}

/**
 * Singleton store for the active i18n locale. Not persisted — the source of
 * truth is `useSettingsStore` (chrome.storage). This store exists solely to
 * give `useFormatMessage` a Zustand subscription so components re-render
 * after a bundle swap, never mid-load.
 */
export const useLocaleStore = create<LocaleStoreState>()((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}));
