// Link filter — render the input as one or more Markdown link(s).

import {
  PARSE_FAILED,
  flattenObjectEntries,
  parseJson,
  stripOuterParens,
  stripOuterQuotes,
} from '@domain/filters/_shared';

function escapeMarkdown(str: string): string {
  return str.replace(/([[\]])/g, '\\$1');
}

function encodeUrl(url: string): string {
  return url.replace(/ /g, '%20');
}

function renderLinkEntry(key: string, value: string): string {
  return `[${escapeMarkdown(value)}](${encodeUrl(escapeMarkdown(key))})`;
}

function parseLinkText(param?: string): string {
  if (!param) return 'link';
  return stripOuterQuotes(stripOuterParens(param));
}

/**
 * Render the input as one or more Markdown links. A bare URL is wrapped as
 * `[linktext](url)`; a JSON array becomes a newline-separated list of links;
 * a JSON object's `key:value` pairs become `[value](key)` links. The
 * optional `param` overrides the default link text (`link`).
 */
export function link(value: string, param?: string): string {
  if (!value.trim()) return value;

  const linkText = parseLinkText(param);

  const data = parseJson(value);
  if (data === PARSE_FAILED) {
    return `[${linkText}](${encodeUrl(escapeMarkdown(value))})`;
  }
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return flattenObjectEntries(item, renderLinkEntry).join('\n');
        }
        return item ? `[${linkText}](${encodeUrl(escapeMarkdown(String(item)))})` : '';
      })
      .join('\n');
  }
  if (typeof data === 'object' && data !== null) {
    return flattenObjectEntries(data, renderLinkEntry).join('\n');
  }
  return value;
}
