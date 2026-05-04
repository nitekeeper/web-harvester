import { describe, test, expect } from 'vitest';

import { round } from '@domain/filters/round';

describe('round filter', () => {
  test('rounds to integer when no parameter given', () => {
    expect(round('1.7')).toBe('2');
  });

  test('rounds to a given number of decimal places', () => {
    expect(round('3.14159', '2')).toBe('3.14');
  });

  test('rounds an array of numbers', () => {
    expect(round('[1.5,2.7]')).toBe('[2,3]');
  });

  test('returns the input unchanged when param is non-numeric', () => {
    expect(round('1.5', 'abc')).toBe('1.5');
  });

  test('passes non-numeric strings through unchanged', () => {
    expect(round('hello')).toBe('hello');
  });
});
