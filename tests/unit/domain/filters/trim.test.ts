import { describe, test, expect } from 'vitest';

import { trim } from '@domain/filters/trim';

describe('trim filter', () => {
  test('trims leading and trailing whitespace', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  test('trims tabs and newlines', () => {
    expect(trim('\t\n hello \n\t')).toBe('hello');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(trim('   ')).toBe('');
  });

  test('returns the same value when no whitespace surrounds it', () => {
    expect(trim('hello')).toBe('hello');
  });
});
