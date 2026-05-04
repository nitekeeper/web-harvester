// Length filter — return item / key / character count of the input.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

/**
 * Return the length of the input as a numeric string. JSON arrays return
 * item count, JSON objects return key count, anything else returns the raw
 * string length.
 */
export function length(value: string): string {
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    if (Array.isArray(parsed)) return parsed.length.toString();
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.keys(parsed).length.toString();
    }
  }
  return value.length.toString();
}
