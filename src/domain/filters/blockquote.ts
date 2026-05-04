// Blockquote filter — prefix each line with `> `, supporting nested arrays
// (deeper prefixes) and pretty-printed objects.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

function processBlockquote(str: string, depth: number): string {
  const prefix = '> '.repeat(depth);
  return str
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function processArray(arr: unknown[], depth: number): string {
  return arr
    .map((item) => {
      if (Array.isArray(item)) return processArray(item, depth + 1);
      return processBlockquote(String(item), depth);
    })
    .join('\n');
}

/**
 * Convert the input to a Markdown blockquote. Single strings get a `> `
 * prefix on each line. JSON arrays produce one quoted line per element with
 * deeper prefixes for nested arrays. JSON objects are pretty-printed and
 * quoted as a single block.
 */
export function blockquote(value: string): string {
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    if (Array.isArray(parsed)) return processArray(parsed, 1);
    if (typeof parsed === 'object' && parsed !== null) {
      return processBlockquote(JSON.stringify(parsed, null, 2), 1);
    }
    return processBlockquote(String(parsed), 1);
  }
  return processBlockquote(value, 1);
}
