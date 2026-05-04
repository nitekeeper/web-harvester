import { describe, test, expect } from 'vitest';

import { length } from '@domain/filters/length';

describe('length filter', () => {
  test('returns string length for non-JSON input', () => {
    expect(length('hello')).toBe('5');
  });

  test('returns array item count for JSON arrays', () => {
    expect(length('[1,2,3]')).toBe('3');
  });

  test('returns key count for JSON objects', () => {
    expect(length('{"a":1,"b":2}')).toBe('2');
  });

  test('returns string length when JSON is a primitive', () => {
    expect(length('42')).toBe('2');
  });
});
