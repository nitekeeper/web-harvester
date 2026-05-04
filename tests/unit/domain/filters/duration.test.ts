import { describe, test, expect } from 'vitest';

import { duration } from '@domain/filters/duration';

describe('duration filter', () => {
  test('formats ISO 8601 duration with hours', () => {
    expect(duration('PT1H30M')).toBe('01:30:00');
  });

  test('formats short ISO 8601 duration without hours', () => {
    expect(duration('PT5M30S')).toBe('05:30');
  });

  test('parses raw seconds when not ISO 8601', () => {
    expect(duration('1868')).toBe('31:08');
  });

  test('uses a custom format', () => {
    expect(duration('PT1H30M', 'H:m:s')).toBe('1:30:0');
  });

  test('returns input for malformed duration', () => {
    expect(duration('abc')).toBe('abc');
  });

  test('returns empty string unchanged', () => {
    expect(duration('')).toBe('');
  });
});
