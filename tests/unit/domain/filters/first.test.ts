import { describe, test, expect } from 'vitest';

import { first } from '@domain/filters/first';

describe('first filter', () => {
  test('returns the first element of a JSON array', () => {
    expect(first('[1,2,3]')).toBe('1');
  });

  test('returns the original string for non-JSON input', () => {
    expect(first('hello')).toBe('hello');
  });

  test('returns empty string unchanged', () => {
    expect(first('')).toBe('');
  });

  test('returns the original string for empty arrays', () => {
    expect(first('[]')).toBe('[]');
  });
});
