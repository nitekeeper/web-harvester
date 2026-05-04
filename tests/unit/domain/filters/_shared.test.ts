import { describe, test, expect } from 'vitest';

import {
  PARSE_FAILED,
  flattenObjectEntries,
  parseJson,
  splitQuoteAware,
  stripOuterParens,
  stripOuterQuotes,
} from '@domain/filters/_shared';

describe('_shared — stripOuterParens', () => {
  test('strips wrapping parentheses', () => {
    expect(stripOuterParens('(foo)')).toBe('foo');
  });

  test('returns input unchanged when not wrapped', () => {
    expect(stripOuterParens('foo')).toBe('foo');
  });
});

describe('_shared — stripOuterQuotes', () => {
  test('strips wrapping double quotes', () => {
    expect(stripOuterQuotes('"foo"')).toBe('foo');
  });

  test('strips wrapping single quotes', () => {
    expect(stripOuterQuotes("'foo'")).toBe('foo');
  });

  test('returns input unchanged when not quoted', () => {
    expect(stripOuterQuotes('foo')).toBe('foo');
  });
});

describe('_shared — splitQuoteAware', () => {
  test('splits on commas outside quotes', () => {
    expect(splitQuoteAware('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  test('does not split on commas inside double quotes', () => {
    expect(splitQuoteAware('"a,b",c')).toEqual(['"a,b"', 'c']);
  });
});

describe('_shared — flattenObjectEntries', () => {
  const render = (key: string, value: string): string => `${key}=${value}`;

  test('flattens an object of string leaves', () => {
    expect(flattenObjectEntries({ a: '1', b: '2' }, render)).toEqual(['a=1', 'b=2']);
  });

  test('recurses into nested objects', () => {
    expect(flattenObjectEntries({ a: { b: 'v' } }, render)).toEqual(['b=v']);
  });

  test('flattens arrays of objects', () => {
    expect(flattenObjectEntries([{ a: '1' }, { b: '2' }], render)).toEqual(['a=1', 'b=2']);
  });

  test('returns single-element array for top-level string', () => {
    expect(flattenObjectEntries('hello', render)).toEqual(['hello']);
  });

  test('drops non-string primitive leaves and top-level primitives', () => {
    expect(flattenObjectEntries(42, render)).toEqual([]);
    expect(flattenObjectEntries({ a: 42 }, render)).toEqual([]);
  });
});

describe('parseJson', () => {
  test('parses valid JSON object', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });
  test('parses valid JSON array', () => {
    expect(parseJson('[1,2,3]')).toEqual([1, 2, 3]);
  });
  test('parses valid JSON string', () => {
    expect(parseJson('"hello"')).toBe('hello');
  });
  test('parses JSON null as null (not a failure)', () => {
    expect(parseJson('null')).toBeNull();
  });
  test('returns PARSE_FAILED for invalid JSON', () => {
    expect(parseJson('not json')).toBe(PARSE_FAILED);
  });
  test('returns PARSE_FAILED for empty string', () => {
    expect(parseJson('')).toBe(PARSE_FAILED);
  });
});
