import { describe, test, expect } from 'vitest';

import { table } from '@domain/filters/table';

describe('table filter', () => {
  test('renders a single object as 2-column key/value table', () => {
    expect(table('{"a":1,"b":2}')).toBe('| a | 1 |\n| - | - |\n| b | 2 |');
  });

  test('renders an array of objects with auto-detected columns', () => {
    expect(table('[{"name":"Alice","age":30},{"name":"Bob","age":25}]')).toBe(
      '| name | age |\n| - | - |\n| Alice | 30 |\n| Bob | 25 |',
    );
  });

  test('renders an array of arrays with custom headers', () => {
    expect(table('[[1,2],[3,4]]', '"x","y"')).toBe('| x | y |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |');
  });

  test('renders a flat array as single-column table', () => {
    expect(table('["a","b"]')).toBe('| Value |\n| - |\n| a |\n| b |');
  });

  test('returns input unchanged for non-JSON input', () => {
    expect(table('hello')).toBe('hello');
  });

  test('returns empty input unchanged', () => {
    expect(table('')).toBe('');
  });

  test('escapes pipe characters in cell content', () => {
    expect(table('{"a":"b|c"}')).toBe('| a | b\\|c |\n| - | - |');
  });
});
