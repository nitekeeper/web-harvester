import { describe, test, expect } from 'vitest';

import { calc } from '@domain/filters/calc';

describe('calc filter', () => {
  test('adds with +', () => {
    expect(calc('10', '+5')).toBe('15');
  });

  test('subtracts with -', () => {
    expect(calc('10', '-3')).toBe('7');
  });

  test('multiplies with *', () => {
    expect(calc('4', '*3')).toBe('12');
  });

  test('divides with /', () => {
    expect(calc('10', '/4')).toBe('2.5');
  });

  test('raises to a power with ^', () => {
    expect(calc('2', '^3')).toBe('8');
  });

  test('raises to a power with **', () => {
    expect(calc('2', '**4')).toBe('16');
  });

  test('strips quotes around the operation parameter', () => {
    expect(calc('5', '"+5"')).toBe('10');
  });

  test('returns the input unchanged when no parameter given', () => {
    expect(calc('5')).toBe('5');
  });

  test('returns the input unchanged for non-numeric input', () => {
    expect(calc('hello', '+5')).toBe('hello');
  });

  test('returns the input unchanged for invalid value', () => {
    expect(calc('10', '+xyz')).toBe('10');
  });
});
