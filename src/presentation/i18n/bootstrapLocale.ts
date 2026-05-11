// src/presentation/i18n/bootstrapLocale.ts

import { loadLocale } from '@application/i18n/localeService';
import { useLocaleStore } from '@presentation/stores/useLocaleStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@shared/constants';
import { createLogger } from '@shared/logger';

const logger = createLogger('bootstrap-locale');

/** Narrows `raw` to a `SupportedLocale`, falling back to `'en'` when unknown. */
function resolveLocale(raw: string): SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as SupportedLocale) : 'en';
}

/** Loads the bundle for `locale` and updates the locale store on success. */
async function applyLocale(locale: SupportedLocale): Promise<void> {
  try {
    await loadLocale(locale);
    useLocaleStore.getState().setLocale(locale);
  } catch (err: unknown) {
    logger.error(`failed to load locale "${locale}"`, err);
  }
}

/**
 * Loads the initial locale bundle, updates the locale store, then registers
 * a `useSettingsStore` subscription so runtime locale switches in the
 * Appearance settings are picked up automatically.
 *
 * Await this in each composition root's `init()` after `bootstrapStore`
 * resolves and before mounting the React tree — first paint will always
 * have correct strings in memory.
 */
export async function bootstrapLocale(rawLocale: string): Promise<void> {
  const locale = resolveLocale(rawLocale);
  await applyLocale(locale);

  let prevRawLocale = rawLocale;

  useSettingsStore.subscribe((state) => {
    const rawNext = state.settings.locale;
    if (rawNext === prevRawLocale) return;
    prevRawLocale = rawNext;
    const next = resolveLocale(rawNext);
    applyLocale(next).catch((err: unknown) => {
      logger.error('locale subscription update failed', err);
    });
  });
}
