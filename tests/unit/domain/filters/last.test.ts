import { describe, test, expect } from 'vitest';

import { last } from '@domain/filters/last';

describe('last filter', () => {
  test('returns the last element of a JSON array', () => {
    expect(last('[1,2,3]')).toBe('3');
  });

  test('returns the original string for non-JSON input', () => {
    expect(last('hello')).toBe('hello');
  });

  test('returns empty string unchanged', () => {
    expect(last('')).toBe('');
  });

  test('returns the original string for empty arrays', () => {
    expect(last('[]')).toBe('[]');
  });
});
