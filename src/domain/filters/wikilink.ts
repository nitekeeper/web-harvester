// Wikilink filter — convert input to one or more `[[...]]` wikilinks.

import {
  PARSE_FAILED,
  flattenObjectEntries,
  parseJson,
  stripOuterParens,
  stripOuterQuotes,
} from '@domain/filters/_shared';

function renderWikilinkEntry(key: string, value: string): string {
  return `[[${key}|${value}]]`;
}

function parseAlias(param?: string): string {
  if (!param) return '';
  return stripOuterQuotes(stripOuterParens(param));
}

function arrayToWikilinks(data: unknown[], alias: string): string {
  const out = data.flatMap((item) => {
    if (typeof item === 'object' && item !== null) {
      return flattenObjectEntries(item, renderWikilinkEntry);
    }
    if (!item) return [''];
    return [alias ? `[[${String(item)}|${alias}]]` : `[[${String(item)}]]`];
  });
  return JSON.stringify(out);
}

/**
 * Convert the input into one or more wikilinks (`[[Page]]` or
 * `[[Page|Alias]]`). Plain strings produce a single wikilink. JSON arrays
 * and objects produce a JSON array of wikilinks.
 */
export function wikilink(value: string, param?: string): string {
  if (!value.trim()) return value;
  const alias = parseAlias(param);

  const data = parseJson(value);
  if (data === PARSE_FAILED) {
    return alias ? `[[${value}|${alias}]]` : `[[${value}]]`;
  }
  if (Array.isArray(data)) return arrayToWikilinks(data, alias);
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(flattenObjectEntries(data, renderWikilinkEntry));
  }
  return value;
}
