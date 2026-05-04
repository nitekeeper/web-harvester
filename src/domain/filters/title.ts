// Title-case filter — converts strings to Title Case with English small-word
// rules.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'for',
  'nor',
  'on',
  'at',
  'to',
  'from',
  'by',
  'in',
  'of',
]);

function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map((word, index) => {
      if (index !== 0 && LOWERCASE_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function processValue(value: unknown): unknown {
  if (typeof value === 'string') return toTitleCase(value);
  if (Array.isArray(value)) return value.map(processValue);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[toTitleCase(key)] = processValue(val);
    }
    return out;
  }
  return value;
}

/**
 * Convert the input to Title Case. Small grammatical words (`a`, `the`,
 * `and`, etc.) stay lowercase mid-sentence. JSON arrays / objects are walked
 * recursively so every contained string is title-cased.
 */
export function title(value: string): string {
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    return JSON.stringify(processValue(parsed));
  }
  return toTitleCase(value);
}
