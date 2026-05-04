// Callout filter — wrap content in an callout block, e.g.
// `> [!info] Title` followed by `> ` lines.

import { splitQuoteAware, stripOuterParens, stripOuterQuotes } from '@domain/filters/_shared';

/** Parsed callout options: type, optional title, and fold state. */
interface CalloutOptions {
  /** Callout type slug (e.g. `info`, `warning`). */
  type: string;
  /** Optional title shown after the type. */
  title: string;
  /** `-` (collapsed), `+` (expanded), or `null` when unspecified. */
  fold: string | null;
}

function parseParams(param: string): string[] {
  // Strip outer parentheses, then split by commas that are NOT inside quotes.
  const stripped = stripOuterParens(param);
  return splitQuoteAware(stripped).map((p) => stripOuterQuotes(p.trim()));
}

function buildOptions(param: string | undefined): CalloutOptions {
  const opts: CalloutOptions = { type: 'info', title: '', fold: null };
  if (!param) return opts;
  const parts = parseParams(param);
  if (parts.length > 0) opts.type = parts[0] || opts.type;
  if (parts.length > 1) opts.title = parts[1] || opts.title;
  if (parts.length > 2) {
    /* v8 ignore next -- length check above guarantees parts[2] is defined */
    const flag = (parts[2] ?? '').toLowerCase();
    if (flag === 'true') opts.fold = '-';
    else if (flag === 'false') opts.fold = '+';
  }
  return opts;
}

/**
 * Wrap the input in a Markdown callout block. The optional `param` accepts
 * either a single value (callout type) or a parenthesised tuple
 * `("type","Title","true|false")` to also set the title and fold state.
 */
export function callout(value: string, param?: string): string {
  const { type, title, fold } = buildOptions(param);

  let header = `> [!${type}]`;
  if (fold) header += fold;
  if (title) header += ` ${title}`;

  const body = value
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `${header}\n${body}`;
}
