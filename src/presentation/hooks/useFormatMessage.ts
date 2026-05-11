// src/presentation/hooks/useFormatMessage.ts
import { formatMessage } from '@application/i18n/localeService';
import { useLocaleStore } from '@presentation/stores/useLocaleStore';

/**
 * Message descriptor accepted by {@link useFormatMessage}. Mirrors the shape
 * used by `react-intl` so call sites are forward-compatible with the real
 * intl hook if adopted later.
 */
export interface MessageDescriptor {
  /** Stable message id used as the lookup key in the locale bundle. */
  readonly id: string;
  /**
   * Optional English fallback retained for call-site compatibility.
   * The real formatter ignores this field — it uses the loaded bundle
   * and falls back to the id when the key is missing.
   */
  readonly defaultMessage?: string;
  /** Optional ICU interpolation values passed through to `formatMessage`. */
  readonly values?: Record<string, string | number>;
}

/**
 * Function signature returned by {@link useFormatMessage}. Always returns a
 * string — falls back to the message `id` when the key is not found in the
 * active locale bundle.
 */
export type FormatMessageFn = (descriptor: MessageDescriptor) => string;

/**
 * Returns a formatter function backed by the real i18n layer. Subscribes to
 * `useLocaleStore` so components re-render when the locale store updates —
 * `bootstrapLocale` updates the store only after `loadLocale` resolves, so
 * re-renders always see a fully loaded bundle.
 */
export function useFormatMessage(): FormatMessageFn {
  useLocaleStore((state) => state.locale);
  return ({ id, values }) => formatMessage(id, values);
}
