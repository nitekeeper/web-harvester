import { describe, test, expect } from 'vitest';

import { unique } from '@domain/filters/unique';

describe('unique filter', () => {
  test('removes duplicates from a JSON array', () => {
    expect(unique('[1,2,2,3,1]')).toBe('[1,2,3]');
  });

  test('deduplicates string arrays', () => {
    expect(unique('["a","b","a"]')).toBe('["a","b"]');
  });

  test('deduplicates arrays of objects by stringified value', () => {
    expect(unique('[{"a":1},{"a":1},{"a":2}]')).toBe('[{"a":1},{"a":2}]');
  });

  test('removes duplicate object values keeping the last key', () => {
    expect(unique('{"a":1,"b":1,"c":2}')).toBe('{"b":1,"c":2}');
  });

  test('returns input unchanged for non-JSON', () => {
    expect(unique('hello')).toBe('hello');
  });
});
