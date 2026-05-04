// Multiple small shape checks instead of one big optional-group regex.
// Each pattern is fully fixed-length (no nested quantifiers) which keeps
// matching strictly linear and avoids `safe-regex` flags.
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_BASE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const ISO_FRACTIONAL = /\.\d{1,9}/;
const ISO_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function stripIsoTimezone(str: string): string {
  return str.replace(ISO_TIMEZONE, '');
}

function stripIsoFractional(str: string): string {
  return str.replace(ISO_FRACTIONAL, '');
}

function isIso8601(str: string): boolean {
  if (ISO_DATE_ONLY.test(str)) {
    return true;
  }
  // Strip optional timezone and fractional-second suffixes, then verify the
  // remaining base form. Each pattern is a single fixed shape, so no regex
  // contains optional groups stacked behind a quantifier.
  const withoutTz = stripIsoTimezone(str);
  const base = stripIsoFractional(withoutTz);
  return ISO_DATETIME_BASE.test(base);
}

/**
 * Formats a Date using a small token vocabulary: YYYY, YY, MM, M, DD, D,
 * HH, mm, ss. Tokens are replaced left-to-right; non-token text is preserved.
 */
export function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', pad(month))
    .replace('DD', pad(day))
    .replace('HH', pad(hours))
    .replace('mm', pad(minutes))
    .replace('ss', pad(seconds))
    .replace('M', String(month))
    .replace('D', String(day));
}

/**
 * Parses a strict ISO 8601 date string. Returns `undefined` for inputs that
 * do not match the ISO 8601 shape or are otherwise unparseable.
 */
export function parseDate(str: string): Date | undefined {
  if (!isIso8601(str)) {
    return undefined;
  }
  const ms = Date.parse(str);
  if (Number.isNaN(ms)) {
    return undefined;
  }
  return new Date(ms);
}

/**
 * Returns the current Date. Wrapped so callers can mock time via this seam
 * rather than calling the global `Date` constructor directly.
 */
export function now(): Date {
  return new Date();
}
