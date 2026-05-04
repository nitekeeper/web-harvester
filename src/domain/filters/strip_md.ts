// Strip-md filter — remove Markdown formatting from a string, leaving plain
// text behind. Pure regex, no DOM access — safe in the domain layer.
//
// Several patterns below are inherently O(n²) on pathological input (e.g.
// `*` italic with deep nesting). The upstream source has shipped these for
// years; we intentionally keep the same patterns and suppress the warning.

/* eslint-disable sonarjs/slow-regex */

const REPLACEMENTS: Array<[RegExp, string | ((...args: string[]) => string)]> = [
  [/!\[([^\]]*)\]\([^)]+\)/g, ''], // images
  [/!\[\[([^\]]+)\]\]/g, ''], // wiki images
  [/\[([^\]]+)\]\([^)]+\)/g, '$1'], // links — keep text
  [/https?:\/\/\S+/g, ''], // bare URLs
  [/(\*\*|__)(.*?)\1/g, '$2'], // bold
  [/([*_])(.*?)\1/g, '$2'], // italic
  [/==(.*?)==/g, '$1'], // highlights
  [/^#+\s+/gm, ''], // headers
  [/`([^`]+)`/g, '$1'], // inline code
  [/```[\s\S]*?```/g, ''], // code blocks
  [/~~(.*?)~~/g, '$1'], // strikethrough
  [/^[-*+] (\[[x ]\] )?/gm, ''], // task lists / list items
  [/^([-*_]){3,}\s*$/gm, ''], // horizontal rules
  [/^>\s+/gm, ''], // blockquotes
  [/\|.*\|/g, ''], // tables
  [/([~^])(\w+)\1/g, '$2'], // sub / sup
  [/:[a-z_]+:/g, ''], // emoji shortcodes
  [/<[^>]+>/g, ''], // HTML tags
  [/\[\s*\]/g, ''], // empty brackets
  [/\[\^[^\]]+\]/g, ''], // footnote refs
  [/^\*\[[^\]]+\]:.+$/gm, ''], // abbreviations
  [/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_match: string, p1: string, p2: string) => p2 || p1], // wikilinks
];

function applyReplacement(
  str: string,
  pattern: RegExp,
  replacement: string | ((...args: string[]) => string),
): string {
  // The two .replace overloads (string vs function) require separate call
  // sites for TypeScript to narrow correctly.
  return typeof replacement === 'string'
    ? str.replace(pattern, replacement)
    : str.replace(pattern, (...args: string[]) => replacement(...args));
}

/**
 * Strip Markdown formatting from the input, returning the underlying plain
 * text. Removes images, links (keeping text), bold / italic / strikethrough,
 * headers, code, tables, footnote refs, wikilinks, and HTML tags.
 */
export function strip_md(value: string): string {
  let str = value;
  for (const [pattern, replacement] of REPLACEMENTS) {
    str = applyReplacement(str, pattern, replacement);
  }
  return str.replace(/\n{3,}/g, '\n\n').trim();
}
