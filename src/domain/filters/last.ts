// Last filter — returns the last element of a JSON array.

import { parseJsonArray } from '@domain/filters/_shared';

/**
 * Return the last element of a JSON array as a string. Non-array or
 * non-JSON input is returned unchanged.
 */
export function last(value: string): string {
  if (value === '') return value;
  const parsed = parseJsonArray(value);
  if (parsed && parsed.length > 0) return String(parsed[parsed.length - 1]);
  return value;
}
