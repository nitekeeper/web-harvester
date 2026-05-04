// src/presentation/hooks/useFormatMessage.ts

/**
 * Message descriptor accepted by the {@link useFormatMessage} stub. Mirrors
 * the shape used by `react-intl` so it can be swapped for the real i18n hook
 * later without touching call sites.
 */
export interface MessageDescriptor {
  /** Stable message id. Returned verbatim when no `defaultMessage` is given. */
  readonly id: string;
  /**
   * Optional human-readable English fallback rendered by the stub when
   * present. Mirrors react-intl's `defaultMessage` field so the real intl
   * formatter can pick it up unchanged once wired in.
   */
  readonly defaultMessage?: string;
}

/** Function signature returned by {@link useFormatMessage}. */
export type FormatMessageFn = (descriptor: MessageDescriptor) => string;

/**
 * Synchronous stub for the popup i18n layer. Returns `defaultMessage` when
 * supplied, otherwise the message id verbatim — so components compile and
 * tests can assert on either form. The real async-loading `formatMessage`
 * from `@domain/i18n/i18n` will be wired up by the composition root
 * (background script) in a later task — see ADR-018 and the popup
 * composition root work tracked under Tasks 47+.
 */
export function useFormatMessage(): FormatMessageFn {
  return ({ id, defaultMessage }) => defaultMessage ?? id;
}
