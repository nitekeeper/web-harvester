// Nth filter — select elements from a JSON array by position, multiplier,
// offset, or CSS-style basis pattern.

import { parseJsonArray } from '@domain/filters/_shared';

function selectByBasis(data: unknown[], params: string): string {
  const parts = params.split(':').map((p) => p.trim());
  /* v8 ignore next 2 -- includes(':') guarantees both parts exist */
  const positions = parts[0] ?? '';
  const basis = parts[1] ?? '';
  const nthValues = positions
    .split(',')
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
  const basisSize = parseInt(basis, 10);
  return JSON.stringify(data.filter((_, index) => nthValues.includes((index % basisSize) + 1)));
}

function selectBySimplePosition(data: unknown[], expr: string): string {
  const position = parseInt(expr, 10);
  return JSON.stringify(data.filter((_, index) => index + 1 === position));
}

function selectByMultiplier(data: unknown[], expr: string): string {
  const multiplier = parseInt(expr, 10);
  return JSON.stringify(data.filter((_, index) => (index + 1) % multiplier === 0));
}

function selectByOffset(data: unknown[], expr: string): string | undefined {
  const match = /^n\+(\d+)$/.exec(expr);
  if (!match) return undefined;
  /* v8 ignore next -- regex guarantees capture group 1 exists */
  const offset = parseInt(match[1] ?? '0', 10);
  return JSON.stringify(data.filter((_, index) => index + 1 >= offset));
}

/**
 * Select elements from a JSON array using a CSS-style nth expression.
 * Supported forms: number (`7`), multiplier (`5n`), offset (`n+7`), and
 * basis pattern (`1,2:5`). Returns the input unchanged for non-array or
 * invalid input.
 */
export function nth(value: string, params?: string): string {
  if (!value || value === 'undefined' || value === 'null') return value;

  const data = parseJsonArray(value);
  if (!data) return value;

  if (!params) return JSON.stringify(data);
  if (params.includes(':')) return selectByBasis(data, params);

  const expr = params.trim();
  if (/^\d+$/.test(expr)) return selectBySimplePosition(data, expr);
  if (/^\d+n$/.test(expr)) return selectByMultiplier(data, expr);
  const offsetResult = selectByOffset(data, expr);
  if (offsetResult !== undefined) return offsetResult;

  return value;
}
