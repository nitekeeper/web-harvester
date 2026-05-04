// Capitalize filter — uppercase the first letter, lowercase the rest. Walks
// JSON structures so each string in arrays / object keys + values is
// capitalized in place.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function capitalizeValue(value: unknown): unknown {
  if (typeof value === 'string') return capitalizeString(value);
  if (Array.isArray(value)) return value.map(capitalizeValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[capitalizeString(key)] = capitalizeValue(val);
    }
    return out;
  }
  return value;
}

/**
 * Capitalize the first letter of the input. If the input parses as JSON,
 * walk arrays and objects and capitalize every string (including object
 * keys); otherwise treat the input as a single string.
 */
export function capitalize(value: string): string {
  if (value === '') return value;
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    return JSON.stringify(capitalizeValue(parsed));
  }
  return capitalizeString(value);
}
