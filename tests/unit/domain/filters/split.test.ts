import { describe, test, expect } from 'vitest';

import { split } from '@domain/filters/split';

const ABC_JSON = '["a","b","c"]';

describe('split filter', () => {
  test('splits by single-character delimiter', () => {
    expect(split('a,b,c', ',')).toBe(ABC_JSON);
  });

  test('splits by quoted delimiter', () => {
    expect(split('a,b,c', '","')).toBe(ABC_JSON);
  });

  test('splits every character when no parameter given', () => {
    expect(split('abc')).toBe(ABC_JSON);
  });

  test('splits by multi-character delimiter (used as regex)', () => {
    expect(split('a--b--c', '--')).toBe(ABC_JSON);
  });

  test('handles empty string by returning empty array', () => {
    expect(split('')).toBe('[]');
  });
});
