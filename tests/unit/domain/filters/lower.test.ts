import { describe, test, expect } from 'vitest';

import { lower } from '@domain/filters/lower';

describe('lower filter', () => {
  test('lowercases an ASCII string', () => {
    expect(lower('HELLO')).toBe('hello');
  });

  test('handles already-lowercase string', () => {
    expect(lower('hello')).toBe('hello');
  });

  test('handles empty string', () => {
    expect(lower('')).toBe('');
  });

  test('uses locale-aware lowercasing for non-ASCII', () => {
    expect(lower('STRASSE')).toBe('strasse');
  });
});
