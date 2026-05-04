import { describe, test, expect } from 'vitest';

import { date_modify } from '@domain/filters/date_modify';

const D = '2024-12-01';
const PLUS_DAY = '+1 day';

describe('date_modify filter', () => {
  test('adds days to a date', () => {
    expect(date_modify(D, PLUS_DAY)).toBe('2024-12-02');
  });

  test('subtracts days from a date', () => {
    expect(date_modify(D, '-1 day')).toBe('2024-11-30');
  });

  test('adds weeks to a date', () => {
    expect(date_modify(D, '+2 weeks')).toBe('2024-12-15');
  });

  test('handles quoted parameter form', () => {
    expect(date_modify(D, '"+1 month"')).toBe('2025-01-01');
  });

  test('returns input unchanged when no param given', () => {
    expect(date_modify(D)).toBe(D);
  });

  test('returns empty string unchanged', () => {
    expect(date_modify('', PLUS_DAY)).toBe('');
  });

  test('returns input unchanged for invalid date', () => {
    expect(date_modify('not-a-date', PLUS_DAY)).toBe('not-a-date');
  });

  test('returns input unchanged for invalid format', () => {
    expect(date_modify(D, 'tomorrow')).toBe(D);
  });
});
