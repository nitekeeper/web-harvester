import { describe, test, expect } from 'vitest';

import { slice } from '@domain/filters/slice';

describe('slice filter', () => {
  test('slices a string from start to end', () => {
    expect(slice('abcdef', '1,4')).toBe('bcd');
  });

  test('slices from start to end of string', () => {
    expect(slice('abcdef', '2')).toBe('cdef');
  });

  test('slices an empty range as empty string', () => {
    expect(slice('abcdef', '0,0')).toBe('');
  });

  test('slices a JSON array', () => {
    expect(slice('[1,2,3,4]', '1,3')).toBe('[2,3]');
  });

  test('returns single element directly when slice has length 1', () => {
    expect(slice('[10,20,30]', '0,1')).toBe('10');
  });

  test('returns input unchanged when no param given', () => {
    expect(slice('hello')).toBe('hello');
  });

  test('returns empty string unchanged', () => {
    expect(slice('', '0,1')).toBe('');
  });

  test('handles open-ended start (empty first part)', () => {
    expect(slice('abcdef', ',3')).toBe('abc');
  });
});
