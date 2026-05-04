import { describe, test, expect } from 'vitest';

import { object } from '@domain/filters/object';

const OBJ = '{"a":1,"b":2}';

describe('object filter', () => {
  test('returns entries as JSON array with "array" param', () => {
    expect(object(OBJ, 'array')).toBe('[["a",1],["b",2]]');
  });

  test('returns keys as JSON array with "keys" param', () => {
    expect(object(OBJ, 'keys')).toBe('["a","b"]');
  });

  test('returns values as JSON array with "values" param', () => {
    expect(object(OBJ, 'values')).toBe('[1,2]');
  });

  test('returns input unchanged for invalid param', () => {
    expect(object('{"a":1}', 'badparam')).toBe('{"a":1}');
  });

  test('returns input unchanged for non-JSON input', () => {
    expect(object('hello', 'keys')).toBe('hello');
  });
});
