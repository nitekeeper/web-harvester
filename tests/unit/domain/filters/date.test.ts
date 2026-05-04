import { describe, test, expect } from 'vitest';

import { date } from '@domain/filters/date';

const ISO_DATE = '2024-12-01';
const YYYY_MM_DD = 'YYYY-MM-DD';
const YYYY_ONLY = 'YYYY';
const ISO_2026 = '2026-05-02';

describe('date filter', () => {
  test('formats a date with the specified format', () => {
    expect(date(ISO_DATE, YYYY_MM_DD)).toBe(ISO_DATE);
  });

  test('extracts the year', () => {
    expect(date(ISO_2026, YYYY_ONLY)).toBe('2026');
  });

  test('uses default YYYY-MM-DD when no format given', () => {
    expect(date(ISO_2026)).toBe(ISO_2026);
  });

  test('parses input with a custom input format', () => {
    expect(date('12/01/2024', '("YYYY-MM-DD","MM/DD/YYYY")')).toBe(ISO_DATE);
  });

  test('returns empty string unchanged', () => {
    expect(date('')).toBe('');
  });

  test('returns input unchanged for invalid date', () => {
    expect(date('not-a-date', YYYY_ONLY)).toBe('not-a-date');
  });

  test('treats "now" as the current date', () => {
    const result = date('now', YYYY_ONLY);
    expect(result).toMatch(/^\d{4}$/);
  });
});
