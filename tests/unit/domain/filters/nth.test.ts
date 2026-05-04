import { describe, test, expect } from 'vitest';

import { nth } from '@domain/filters/nth';

describe('nth filter', () => {
  test('returns the entire array when no param given', () => {
    expect(nth('[1,2,3]')).toBe('[1,2,3]');
  });

  test('selects a single position', () => {
    expect(nth('[1,2,3,4,5]', '3')).toBe('[3]');
  });

  test('selects every Nth element with multiplier', () => {
    expect(nth('[1,2,3,4,5,6]', '2n')).toBe('[2,4,6]');
  });

  test('selects elements from offset with n+b', () => {
    expect(nth('[1,2,3,4,5]', 'n+3')).toBe('[3,4,5]');
  });

  test('selects positions per basis pattern', () => {
    expect(nth('[1,2,3,4,5,6,7,8]', '1,3:4')).toBe('[1,3,5,7]');
  });

  test('returns input unchanged for non-array', () => {
    expect(nth('hello')).toBe('hello');
  });

  test('returns input unchanged for invalid syntax', () => {
    expect(nth('[1,2,3]', 'garbage')).toBe('[1,2,3]');
  });
});
