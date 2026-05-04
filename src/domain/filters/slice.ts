// Slice filter — slice strings or JSON arrays by start, end indices.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

function parseIndices(param: string): [number | undefined, number | undefined] {
  const [start, end] = param
    .split(',')
    .map((p) => p.trim())
    .map((p) => {
      if (p === '') return undefined;
      const num = parseInt(p, 10);
      return isNaN(num) ? undefined : num;
    });
  return [start, end];
}

/**
 * Slice the input by `start,end` indices. JSON arrays return either a
 * single element (when the slice has length 1) or a JSON-stringified array.
 * Plain strings return the substring. Returns the input unchanged when no
 * parameter is given.
 */
export function slice(value: string, param?: string): string {
  if (!param) return value;
  if (value === '') return value;

  const [start, end] = parseIndices(param);

  const parsedJson = parseJson(value);
  const parsed: unknown = parsedJson !== PARSE_FAILED ? parsedJson : value;

  if (Array.isArray(parsed)) {
    const sliced = parsed.slice(start, end);
    if (sliced.length === 1) return String(sliced[0]);
    return JSON.stringify(sliced);
  }

  return value.slice(start, end);
}
