// Split filter — split a string into a JSON array using a delimiter.

import { stripOuterParens, stripOuterQuotes } from '@domain/filters/_shared';

/**
 * Split the input into a JSON-stringified array. When no parameter is
 * provided, every character becomes its own element. A single-character
 * parameter is used as a literal delimiter; a multi-character parameter is
 * compiled into a regular expression. Outer parentheses and surrounding
 * quotes are stripped from the parameter before use.
 */
export function split(value: string, param?: string): string {
  if (!param) return JSON.stringify(value.split(''));

  const cleaned = stripOuterQuotes(stripOuterParens(param));

  // eslint-disable-next-line security/detect-non-literal-regexp
  const separator: string | RegExp = cleaned.length === 1 ? cleaned : new RegExp(cleaned);
  return JSON.stringify(value.split(separator));
}
