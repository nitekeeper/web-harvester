// src/domain/i18n/i18n.ts

import IntlMessageFormat from 'intl-messageformat';

import {
  RTL_LOCALES as RTL_LOCALE_LIST,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@shared/constants';

export { SUPPORTED_LOCALES };
export type { SupportedLocale };

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Internal shape of a parsed messages.json bundle. */
type MessageRecord = Record<string, { message: string }>;

/**
 * Statically-analyzable map of every locale's messages.json bundle.
 * Using `import.meta.glob` (relative path) lets Vite include each locale
 * file in the production bundle and code-split them as separate chunks.
 * A bare dynamic `import(\`...${locale}...\`)` would either be ignored
 * by Vite (locales missing from `dist/`) or require runtime fetches.
 */
const localeModules = import.meta.glob<{ default: MessageRecord }>('./_locales/*/messages.json');

/** Pre-built lookup set for O(1) RTL membership tests. */
export const RTL_LOCALES: ReadonlySet<SupportedLocale> = new Set(RTL_LOCALE_LIST);

let currentLocale: SupportedLocale = 'en';
let activeMessages: MessageRecord = {};
let englishMessages: MessageRecord | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Dynamically imports the given locale's messages JSON and activates it.
 * English is always available as a fallback — if the locale is not 'en', the
 * English messages are lazy-loaded on the first non-English load call.
 *
 * State is mutated only after every `await` resolves so that a partial
 * failure (e.g. the English fallback import throws) cannot leave the module
 * in an inconsistent state.
 */
export async function loadLocale(locale: SupportedLocale): Promise<void> {
  const mod = await loadLocaleModule(locale);

  // Pre-load English fallback before mutating state, so a failure doesn't corrupt state.
  let nextEnglish: MessageRecord | null = englishMessages;
  if (locale !== 'en' && nextEnglish === null) {
    const enMod = await loadLocaleModule('en');
    nextEnglish = enMod.default;
  }

  // Only mutate state after all async operations succeed.
  activeMessages = mod.default;
  currentLocale = locale;
  englishMessages = locale === 'en' ? activeMessages : nextEnglish;
}

/**
 * Formats a message by id, substituting `values` into ICU placeholders.
 * Falls back to English when the key is absent from the active locale.
 * Returns the id itself when the key is not found anywhere.
 */
export function formatMessage(id: string, values?: Record<string, string | number>): string {
  const template = resolveTemplate(id);
  if (template === null) return id;
  try {
    const fmt = new IntlMessageFormat(template, currentLocale);
    return String(fmt.format(values ?? {}));
  } catch {
    return template;
  }
}

/** Returns the currently active locale code. */
export function getCurrentLocale(): SupportedLocale {
  return currentLocale;
}

/** Returns true when `locale` is a right-to-left locale. */
export function isRTL(locale: SupportedLocale): boolean {
  return RTL_LOCALES.has(locale);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a locale to its messages module via the static glob map.
 * Throws when the locale is not present in the glob — `SupportedLocale`
 * makes this unreachable for well-typed callers, but a runtime guard keeps
 * us honest if the locale list and the on-disk `_locales/` ever drift.
 */
async function loadLocaleModule(locale: SupportedLocale): Promise<{ default: MessageRecord }> {
  const key = `./_locales/${locale}/messages.json`;
  if (!Object.prototype.hasOwnProperty.call(localeModules, key)) {
    throw new Error(`No messages bundle registered for locale "${locale}"`);
  }
  const loader = Reflect.get(localeModules, key) as () => Promise<{ default: MessageRecord }>;
  return loader();
}

/** Resolves the ICU template string for a message id, with English fallback. */
function resolveTemplate(id: string): string | null {
  const active = lookup(activeMessages, id);
  if (active !== null) return active;
  if (englishMessages !== null) {
    const fallback = lookup(englishMessages, id);
    if (fallback !== null) return fallback;
  }
  return null;
}

/**
 * Safely reads a message entry from a record, returning null if absent or
 * if the entry is not an object with a string `message` property. The shape
 * is validated rather than blindly cast so a malformed messages.json cannot
 * propagate `undefined` into the ICU formatter.
 */
function lookup(record: MessageRecord, id: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(record, id)) return null;
  const entry = Reflect.get(record, id) as unknown;
  if (typeof entry !== 'object' || entry === null) return null;
  const msg = (entry as { message?: unknown }).message;
  return typeof msg === 'string' ? msg : null;
}
