import { describe, test, expect } from 'vitest';

import { join } from '@domain/filters/join';

describe('join filter', () => {
  test('joins JSON array with default comma', () => {
    expect(join('["a","b","c"]')).toBe('a,b,c');
  });

  test('uses a custom separator', () => {
    expect(join('["a","b","c"]', '" - "')).toBe('a - b - c');
  });

  test('decodes \\n into newline in separator', () => {
    expect(join('["a","b"]', '"\\n"')).toBe('a\nb');
  });

  test('returns empty string for empty input', () => {
    expect(join('')).toBe('');
  });

  test('returns input unchanged for non-array JSON', () => {
    expect(join('"hello"')).toBe('"hello"');
  });
});
