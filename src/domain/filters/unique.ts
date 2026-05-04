// Unique filter — remove duplicates from JSON arrays / objects.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

function uniqueArray(parsed: unknown[]): string {
  if (parsed.every((item) => typeof item !== 'object')) {
    return JSON.stringify([...new Set(parsed)]);
  }
  const seen = new Set<string>();
  const out = parsed.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return JSON.stringify(out);
}

function uniqueObject(record: Record<string, unknown>): string {
  // Walk entries in reverse so the LAST occurrence's key is kept.
  const reverseEntries = Object.entries(record).reverse();
  const seen = new Set<string>();
  const filtered = reverseEntries.filter(([, value]) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return JSON.stringify(Object.fromEntries(filtered.reverse()));
}

/**
 * Remove duplicates from a JSON array or object. Arrays of primitives use a
 * Set; arrays of objects compare by stringified value. Objects keep the
 * LAST key for each duplicate value.
 */
export function unique(value: string): string {
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    if (Array.isArray(parsed)) return uniqueArray(parsed);
    if (typeof parsed === 'object' && parsed !== null) {
      return uniqueObject(parsed as Record<string, unknown>);
    }
  }
  return value;
}
