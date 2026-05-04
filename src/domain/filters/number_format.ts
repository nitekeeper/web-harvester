// Number-format filter — format a number with custom decimal places, decimal
// point, and thousands separator. Walks JSON arrays / objects so contained
// numbers are formatted in place.

import {
  PARSE_FAILED,
  parseJson,
  stripLooseQuotes,
  stripOuterParens,
} from '@domain/filters/_shared';

/** Number-formatting options parsed from the `number_format` parameter. */
interface FormatOptions {
  /** Number of decimal places (default 0). */
  decimals: number;
  /** Decimal point character (default `.`). */
  decPoint: string;
  /** Thousands separator (default `,`). */
  thousandsSep: string;
}

function unescapeStr(str: string): string {
  return str.replace(/\\(.)/g, '$1');
}

function splitParams(cleanParam: string): string[] {
  const params: string[] = [];
  let current = '';
  let inQuote = false;
  let escapeNext = false;

  for (const char of cleanParam) {
    if (escapeNext) {
      current += char;
      escapeNext = false;
    } else if (char === '\\') {
      current += char;
      escapeNext = true;
    } else if (char === '"' && !inQuote) {
      inQuote = true;
    } else if (char === '"' && inQuote) {
      inQuote = false;
    } else if (char === ',' && !inQuote) {
      params.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current) params.push(current.trim());
  return params;
}

function parseOptions(param: string | undefined): FormatOptions {
  const opts: FormatOptions = { decimals: 0, decPoint: '.', thousandsSep: ',' };
  if (!param) return opts;
  const cleanParam = stripOuterParens(param);
  const params = splitParams(cleanParam);
  /* v8 ignore next 8 -- defensive `?? '...'` defaults are unreachable when params.length >= N */
  if (params.length >= 1) opts.decimals = parseInt(params[0] ?? '0', 10);
  if (params.length >= 2) {
    opts.decPoint = unescapeStr(stripLooseQuotes(params[1] ?? ''));
  }
  if (params.length >= 3) {
    opts.thousandsSep = unescapeStr(stripLooseQuotes(params[2] ?? ''));
  }
  if (isNaN(opts.decimals)) opts.decimals = 0;
  return opts;
}

function formatNumber(num: number, opts: FormatOptions): string {
  const parts = num.toFixed(opts.decimals).split('.');
  /* v8 ignore next 2 -- toFixed always returns a string with at least the integer part */
  // eslint-disable-next-line security/detect-unsafe-regex, sonarjs/slow-regex
  const integerPart = (parts[0] ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousandsSep);
  const decimalPart = parts[1];
  return decimalPart === undefined ? integerPart : `${integerPart}${opts.decPoint}${decimalPart}`;
}

function processValue(value: unknown, opts: FormatOptions): unknown {
  if (typeof value === 'number') return formatNumber(value, opts);
  if (typeof value === 'string' && !isNaN(parseFloat(value))) {
    return formatNumber(parseFloat(value), opts);
  }
  if (Array.isArray(value)) return value.map((item) => processValue(item, opts));
  if (typeof value === 'object' && value !== null) {
    // jscpd:ignore-start
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // eslint-disable-next-line security/detect-object-injection
      out[key] = processValue(val, opts);
    }
    return out;
    // jscpd:ignore-end
  }
  return value;
}

/**
 * Format a number with custom decimal places, decimal point, and thousands
 * separator. JSON arrays / objects are walked recursively so every contained
 * number is formatted.
 */
export function number_format(value: string, param?: string): string {
  const opts = parseOptions(param);
  const parsedJson = parseJson(value);
  const parsed: unknown = parsedJson !== PARSE_FAILED ? parsedJson : value;
  const result = processValue(parsed, opts);
  return typeof result === 'string' ? result : JSON.stringify(result);
}
