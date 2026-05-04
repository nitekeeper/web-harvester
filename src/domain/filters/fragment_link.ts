// Fragment-link filter — append a text-fragment link to each item, returning
// a JSON array string. Pure URL/string manipulation, no DOM access.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';
import { strip_md } from '@domain/filters/strip_md';

/** Start and (optional) end snippets used to build a Chrome text-fragment URL. */
interface FragmentParts {
  /** Required start snippet (first 5 words for long text, full text otherwise). */
  start: string;
  /** Optional end snippet (last 5 words for text > 10 words). */
  end?: string;
}

function extractFragmentParts(text: string): FragmentParts {
  const stripped = strip_md(text);
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length > 10) {
    return { start: words.slice(0, 5).join(' '), end: words.slice(-5).join(' ') };
  }
  return { start: words.join(' ') };
}

function createFragmentUrl(text: string): string {
  const { start, end } = extractFragmentParts(text);
  const encodedEnd = end ? ',' + encodeURIComponent(end) : '';
  return '#:~:text=' + encodeURIComponent(start) + encodedEnd;
}

function parseParam(param: string): { linkText: string; currentUrl: string } {
  const match = /^(.*?):?((https?:\/\/|file:\/\/).*$)/.exec(param);
  const linkText = String(match?.[1]?.trim().replace(/(['"])/g, '') || 'link');
  const currentUrl = String(match?.[2] || param);
  return { linkText, currentUrl };
}

function appendFragmentLink(text: string, linkText: string, currentUrl: string): string {
  return `${text} [${linkText}](${currentUrl}${createFragmentUrl(text)})`;
}

function processArrayItem(item: unknown, linkText: string, currentUrl: string): unknown {
  if (typeof item === 'object' && item !== null && 'text' in item) {
    const obj = item as { text: string } & Record<string, unknown>;
    return { ...obj, text: appendFragmentLink(obj.text, linkText, currentUrl) };
  }
  return appendFragmentLink(String(item), linkText, currentUrl);
}

/**
 * Append a Chrome text-fragment link to each item, returning a
 * JSON-stringified array. The `param` is parsed as `[linktext]:url` (the
 * link text is optional; defaults to `link`). Both string and JSON-array
 * inputs are supported; objects with a `text` property are processed
 * in-place.
 */
export function fragment_link(value: string, param?: string): string {
  if (!param || !value.trim()) return JSON.stringify([value]);

  const { linkText, currentUrl } = parseParam(param);

  const data = parseJson(value);
  if (data !== PARSE_FAILED) {
    if (Array.isArray(data)) {
      return JSON.stringify(data.map((item) => processArrayItem(item, linkText, currentUrl)));
    }
    if (typeof data === 'object' && data !== null) {
      const out = Object.values(data).map((v) =>
        appendFragmentLink(String(v), linkText, currentUrl),
      );
      return JSON.stringify(out);
    }
    if (typeof data === 'string') {
      return JSON.stringify([appendFragmentLink(data, linkText, currentUrl)]);
    }
  }
  return JSON.stringify([value]);
}
