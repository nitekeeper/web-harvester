import { describe, test, expect } from 'vitest';

import { capitalize } from '@domain/filters/capitalize';

describe('capitalize filter', () => {
  test('capitalizes a plain string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('lowercases the rest of the string', () => {
    expect(capitalize('hELLO')).toBe('Hello');
  });

  test('handles JSON array input by capitalizing each string', () => {
    expect(capitalize('["hello","world"]')).toBe('["Hello","World"]');
  });

  test('handles JSON object input by capitalizing keys and values', () => {
    expect(capitalize('{"hello":"world"}')).toBe('{"Hello":"World"}');
  });

  test('returns empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  test('passes non-string JSON values through unchanged', () => {
    expect(capitalize('123')).toBe('123');
  });

  test('returns "null" unchanged for JSON null input', () => {
    // JSON null is a valid parse result — JSON.stringify(null) produces 'null'
    expect(capitalize('null')).toBe('null');
  });
});
