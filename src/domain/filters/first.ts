// First filter — returns the first element of a JSON array.

import { parseJsonArray } from '@domain/filters/_shared';

/**
 * Return the first element of a JSON array as a string. Non-array or
 * non-JSON input is returned unchanged.
 */
export function first(value: string): string {
  if (value === '') return value;
  const parsed = parseJsonArray(value);
  if (parsed && parsed.length > 0) return String(parsed[0]);
  return value;
}
