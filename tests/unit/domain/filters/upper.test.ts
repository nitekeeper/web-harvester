import { describe, test, expect } from 'vitest';

import { upper } from '@domain/filters/upper';

describe('upper filter', () => {
  test('uppercases an ASCII string', () => {
    expect(upper('hello')).toBe('HELLO');
  });

  test('handles already-uppercase string', () => {
    expect(upper('HELLO')).toBe('HELLO');
  });

  test('handles empty string', () => {
    expect(upper('')).toBe('');
  });

  test('uses locale-aware uppercasing', () => {
    expect(upper('istanbul')).toBe('ISTANBUL');
  });
});
