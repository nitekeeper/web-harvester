// Merge filter — append additional items (parsed from a comma-separated
// param) to a JSON array.

import {
  PARSE_FAILED,
  parseJson,
  stripOuterParens,
  stripOuterQuotes,
} from '@domain/filters/_shared';

function parseAdditionalItems(param: string): string[] {
  const cleaned = stripOuterParens(param);
  // eslint-disable-next-line security/detect-unsafe-regex
  const matches = cleaned.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/g);
  /* v8 ignore next -- match always returns array for non-empty cleaned param */
  if (!matches) return [];
  return matches.map((item) => stripOuterQuotes(item.trim()));
}

/**
 * Append additional items to a JSON array. Additional items are supplied as
 * a comma-separated parameter; each item may be quoted. Non-array input is
 * wrapped in a single-element array first.
 */
export function merge(value: string, param?: string): string {
  if (!value || value === 'undefined' || value === 'null') return '[]';

  const parsed = parseJson(value);
  if (parsed === PARSE_FAILED) return value;
  const array: unknown[] = Array.isArray(parsed) ? parsed : [value];

  if (!param) return JSON.stringify(array);

  return JSON.stringify([...array, ...parseAdditionalItems(param)]);
}
