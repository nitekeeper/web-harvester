import { describe, test, expect } from 'vitest';

import { reverse } from '@domain/filters/reverse';

describe('reverse filter', () => {
  test('reverses a JSON array', () => {
    expect(reverse('[1,2,3]')).toBe('[3,2,1]');
  });

  test('reverses character order of a non-JSON string', () => {
    expect(reverse('hello')).toBe('olleh');
  });

  test('reverses object key order', () => {
    expect(reverse('{"a":1,"b":2}')).toBe('{"b":2,"a":1}');
  });

  test('returns empty string for empty / undefined / null input', () => {
    expect(reverse('')).toBe('');
    expect(reverse('undefined')).toBe('');
    expect(reverse('null')).toBe('');
  });
});
