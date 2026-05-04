// Footnote filter — render an array or object as a Markdown footnote list.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';
import { kebab } from '@domain/filters/kebab';

/**
 * Render a JSON array or object as a Markdown footnote definition list.
 * Arrays produce `[^1]: ...` numbered references; objects produce
 * `[^my-key]: ...` references with kebab-case keys.
 */
export function footnote(value: string): string {
  if (value === '') return value;
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => `[^${index + 1}]: ${String(item)}`).join('\n\n');
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed)
        .map(([key, val]) => `[^${kebab(key)}]: ${String(val)}`)
        .join('\n\n');
    }
  }
  return value;
}
