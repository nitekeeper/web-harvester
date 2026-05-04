// Join filter — join a JSON array into a single string.

import { stripOuterQuotes } from '@domain/filters/_shared';

/**
 * Join a JSON array into a single string. The default separator is `,`.
 * The separator may be quoted; `\n` literals are decoded to actual newlines.
 * Returns the input unchanged for non-array JSON.
 */
export function join(value: string, param?: string): string {
  if (!value || value === 'undefined' || value === 'null') return '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value;
  }

  if (!Array.isArray(parsed)) return value;

  let separator = ',';
  if (param) {
    separator = stripOuterQuotes(param).replace(/\\n/g, '\n');
  }

  return parsed.join(separator);
}
