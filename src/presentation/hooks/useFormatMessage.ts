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
  /**
   * Optional interpolation values. Each `{key}` placeholder in `defaultMessage`
   * is replaced with the corresponding value. Mirrors react-intl's `values`
   * field so the real formatter can consume it unchanged once wired in.
   */
  readonly values?: Record<string, string | number>;
}

/** Function signature returned by {@link useFormatMessage}. */
export type FormatMessageFn = (descriptor: MessageDescriptor) => string;

/**
 * Substitutes `{key}` placeholders in `template` with values from `values`.
 * Used by the stub formatter until the real i18n layer is wired in.
 */
function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return `{${key}}`;
    return String(Reflect.get(values, key) as string | number);
  });
}

/**
 * Synchronous stub for the popup i18n layer. Returns `defaultMessage` when
 * supplied (with `{key}` placeholders replaced by `values`), otherwise the
 * message id verbatim — so components compile and tests can assert on either
 * form. The real async-loading `formatMessage` from `@domain/i18n/i18n` will
 * be wired up by the composition root (background script) in a later task —
 * see ADR-018 and the popup composition root work tracked under Tasks 47+.
 */
export function useFormatMessage(): FormatMessageFn {
  return ({ id, defaultMessage, values }) => {
    const template = defaultMessage ?? id;
    if (values === undefined) return template;
    return interpolate(template, values);
  };
}
