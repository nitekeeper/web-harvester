// Object filter — view a JSON object as `array`, `keys`, or `values`.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

/**
 * Convert a JSON object to one of: a JSON array of `[key, value]` pairs
 * (`param='array'`), a JSON array of keys (`param='keys'`), or a JSON
 * array of values (`param='values'`). Returns the input unchanged for
 * invalid params or non-object input.
 */
export function object(value: string, param?: string): string {
  const obj = parseJson(value);
  if (obj === PARSE_FAILED || obj === null || typeof obj !== 'object') return value;
  const record = obj as Record<string, unknown>;
  if (param === 'array') return JSON.stringify(Object.entries(record));
  if (param === 'keys') return JSON.stringify(Object.keys(record));
  if (param === 'values') return JSON.stringify(Object.values(record));
  return value;
}
