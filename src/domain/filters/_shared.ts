// Internal helpers shared across the domain filter implementations. Not
// exported from `index.ts` — the leading underscore signals "module-private".

/** Strip wrapping parentheses: `(foo)` → `foo`. Non-wrapped input returned unchanged. */
export function stripOuterParens(s: string): string {
  return s.replace(/^\((.*)\)$/, '$1');
}

/** Strip wrapping single or double quotes: `"foo"` → `foo`. Non-quoted input returned unchanged. */
export function stripOuterQuotes(s: string): string {
  return s.replace(/^(['"])([\s\S]*)\1$/, '$2');
}

/**
 * Strip a leading and trailing `"` or `'` character from a string.
 * Unlike {@link stripOuterQuotes}, the quotes do not need to match.
 * Returns the input unchanged if it does not start with a quote character.
 */
export function stripLooseQuotes(s: string): string {
  return s.replace(/^["'](.*)["']$/, '$1');
}

/** Zero-pad a number to two digits: `3` → `'03'`. */
export function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Sentinel value returned by {@link parseJson} when the input is not valid JSON. */
export const PARSE_FAILED: unique symbol = Symbol('parse-failed');

/**
 * Parse a JSON string and return the parsed value. Returns {@link PARSE_FAILED}
 * if the input is not valid JSON, allowing callers to distinguish parse failure
 * from a legitimate JSON `null` value.
 */
export function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return PARSE_FAILED;
  }
}

/**
 * Parse a JSON string and return the result as an array, or `null` if the
 * input is not valid JSON or not an array.
 */
export function parseJsonArray(value: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Split a comma-separated parameter string, respecting quoted sections. */
export function splitQuoteAware(s: string): string[] {
  // eslint-disable-next-line security/detect-unsafe-regex, sonarjs/slow-regex
  return s.split(/,(?=(?:(?:[^"']*["'][^"']*["'])*[^"']*$))/);
}

/**
 * Recursively flatten a nested object/array into a list of rendered strings.
 * For each leaf string value, `renderEntry(key, value)` is called.
 */
export function flattenObjectEntries(
  obj: unknown,
  renderEntry: (key: string, value: string) => string,
): string[] {
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap((v: unknown) => flattenObjectEntries(v, renderEntry));
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
      if (typeof v === 'string') return [renderEntry(k, v)];
      return flattenObjectEntries(v, renderEntry);
    });
  }
  return [];
}
