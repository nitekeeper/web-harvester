// Round filter — round numbers to integer or N decimal places. Walks JSON
// arrays / objects so contained numbers are rounded too.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

function roundNumber(num: number, decimalPlaces?: number): number {
  if (decimalPlaces === undefined) return Math.round(num);
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(num * factor) / factor;
}

function processValue(value: unknown, decimalPlaces?: number): unknown {
  if (typeof value === 'number') return roundNumber(value, decimalPlaces);
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? value : roundNumber(num, decimalPlaces).toString();
  }
  if (Array.isArray(value)) return value.map((item) => processValue(item, decimalPlaces));
  if (typeof value === 'object' && value !== null) {
    // jscpd:ignore-start
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // eslint-disable-next-line security/detect-object-injection
      out[key] = processValue(val, decimalPlaces);
    }
    return out;
    // jscpd:ignore-end
  }
  return value;
}

/**
 * Round numbers to integers or to a given number of decimal places. JSON
 * arrays / objects are walked recursively so every contained number is
 * rounded. Returns the input unchanged when the parameter is non-numeric.
 */
export function round(value: string, param?: string): string {
  if (param !== undefined && isNaN(Number(param))) return value;
  const decimalPlaces = param ? parseInt(param, 10) : undefined;

  const parsedJson = parseJson(value);
  const parsed: unknown = parsedJson !== PARSE_FAILED ? parsedJson : value;

  const result = processValue(parsed, decimalPlaces);
  return typeof result === 'string' ? result : JSON.stringify(result);
}
