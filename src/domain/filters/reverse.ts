// Reverse filter — reverse arrays, object key order, or string characters.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

/**
 * Reverse the input. JSON arrays are reversed in place, JSON objects have
 * their key order reversed, and anything else has its characters reversed.
 * Empty / `'undefined'` / `'null'` inputs return `''`.
 */
export function reverse(value: string): string {
  if (!value || value === 'undefined' || value === 'null') return '';

  const parsed = parseJson(value);
  if (parsed === PARSE_FAILED) {
    return value.split('').reverse().join('');
  }
  if (Array.isArray(parsed)) {
    return JSON.stringify([...parsed].reverse());
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const entries = Object.entries(parsed).reverse();
    return JSON.stringify(Object.fromEntries(entries));
  }

  return value;
}
