import { describe, it, expect } from 'vitest';

import { formatDate, parseDate, now } from '@shared/date-utils';

describe('formatDate', () => {
  const fixed = new Date(2024, 0, 5, 9, 3, 7); // 2024-01-05 09:03:07

  it('formats YYYY-MM-DD', () => {
    expect(formatDate(fixed, 'YYYY-MM-DD')).toBe('2024-01-05');
  });

  it('formats DD/MM/YYYY', () => {
    expect(formatDate(fixed, 'DD/MM/YYYY')).toBe('05/01/2024');
  });

  it('formats HH:mm:ss', () => {
    expect(formatDate(fixed, 'HH:mm:ss')).toBe('09:03:07');
  });

  it('formats YY (two-digit year)', () => {
    expect(formatDate(fixed, 'YY')).toBe('24');
  });

  it('formats M (non-padded month)', () => {
    expect(formatDate(fixed, 'M')).toBe('1');
  });

  it('formats D (non-padded day)', () => {
    expect(formatDate(fixed, 'D')).toBe('5');
  });

  it('supports a full datetime format', () => {
    expect(formatDate(fixed, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-05 09:03:07');
  });

  it('leaves non-token text untouched', () => {
    expect(formatDate(fixed, '"Year:" YYYY')).toBe('"Year:" 2024');
  });
});

describe('parseDate', () => {
  it('parses a valid ISO 8601 date string', () => {
    const result = parseDate('2024-06-15T12:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2024-06-15T12:00:00.000Z');
  });

  it('parses a date-only ISO string', () => {
    const result = parseDate('2024-06-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
  });

  it('returns undefined for an invalid string', () => {
    expect(parseDate('not-a-date')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseDate('')).toBeUndefined();
  });

  it('returns undefined for a partial non-ISO string', () => {
    expect(parseDate('June 15')).toBeUndefined();
  });

  it('returns undefined for a shape-valid but logically invalid date', () => {
    expect(parseDate('2024-13-45')).toBeUndefined();
  });
});

describe('now', () => {
  it('returns a Date instance', () => {
    expect(now()).toBeInstanceOf(Date);
  });

  it('returns approximately the current time', () => {
    const before = Date.now();
    const result = now().getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});
