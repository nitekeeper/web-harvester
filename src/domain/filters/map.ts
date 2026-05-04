// Map filter — apply an arrow-function expression to each element of a JSON
// array. Supports identifier accessor (`x.name`), string template (`"${x}!"`),
// and object literal (`({key: x.field})`) forms.

import { PARSE_FAILED, parseJson, stripLooseQuotes } from '@domain/filters/_shared';

function getNestedProperty(obj: unknown, path: string): unknown {
  return path
    .split(/[.[\]]/)
    .filter(Boolean)
    .reduce<unknown>((current, key) => {
      if (current && Array.isArray(current) && /^\d+$/.test(key)) {
        return current[parseInt(key, 10)];
      }
      if (current && typeof current === 'object') {
        const rec = current as Record<string, unknown>;
        // eslint-disable-next-line security/detect-object-injection
        return Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
      }
      return undefined;
    }, obj);
}

function evaluateExpression(expression: string, item: unknown, argName: string): unknown {
  if (typeof item === 'string') return item;
  /* eslint-disable security/detect-non-literal-regexp */
  const result = expression.replace(
    new RegExp(`${argName}\\.([\\w.\\[\\]]+)`, 'g'),
    (_match, prop: string) => JSON.stringify(getNestedProperty(item, prop)),
  );
  /* eslint-enable security/detect-non-literal-regexp */
  try {
    return JSON.parse(result);
  } catch {
    return stripLooseQuotes(result);
  }
}

function processStringLiteral(expr: string, item: unknown, argName: string): string {
  const literal = expr.slice(1, -1);
  // eslint-disable-next-line security/detect-non-literal-regexp
  return literal.replace(new RegExp(`\\$\\{${argName}\\}`, 'g'), String(item));
}

function processObjectLiteral(
  expr: string,
  item: unknown,
  argName: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  /* v8 ignore next 2 -- caller ensures expr is `{...}` so the regex always matches */
  // eslint-disable-next-line sonarjs/slow-regex
  const inner = /\{(.+)\}/.exec(expr)?.[1] ?? '';
  for (const assignment of inner.split(',')) {
    const parts = assignment.split(':').map((s) => s.trim());
    /* v8 ignore next 2 -- split() always returns at least one element */
    const key = parts[0] ?? '';
    const value = parts[1] ?? '';
    const cleanKey = key.replace(/^['"](.+)['"]$/, '$1');
    // eslint-disable-next-line security/detect-object-injection
    out[cleanKey] = evaluateExpression(value, item, argName);
  }
  return out;
}

function mapItem(expression: string, item: unknown, argName: string): unknown {
  let expr = expression.trim();
  if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();

  if (expr.startsWith('{') && expr.endsWith('}')) {
    return processObjectLiteral(expr, item, argName);
  }
  if (
    (expr.startsWith('"') && expr.endsWith('"')) ||
    (expr.startsWith("'") && expr.endsWith("'"))
  ) {
    return processStringLiteral(expr, item, argName);
  }
  return evaluateExpression(expression, item, argName);
}

/**
 * Apply an arrow-function expression to each element of a JSON array.
 * Supported forms: identifier (`x => x.name`), string template
 * (`x => "${x}!"`), and object literal (`x => ({key: x.field})`).
 * Returns the input unchanged when the param is missing or malformed.
 */
export function map(value: string, param?: string): string {
  const parsedJson = parseJson(value);
  const parsed: unknown = parsedJson !== PARSE_FAILED ? parsedJson : [value];

  if (!Array.isArray(parsed) || !param) return value;

  // eslint-disable-next-line sonarjs/slow-regex
  const arrowMatch = /^\s*(\w+)\s*=>\s*(.+)$/.exec(param);
  if (!arrowMatch) return value;
  /* v8 ignore next 2 -- regex captures are guaranteed when match is non-null */
  const argName = arrowMatch[1] ?? '';
  const expression = arrowMatch[2] ?? '';

  const mapped = parsed.map((item) => mapItem(expression, item, argName));
  return JSON.stringify(mapped);
}
