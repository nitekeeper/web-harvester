import { describe, test, expect } from 'vitest';

import { title } from '@domain/filters/title';

describe('title filter', () => {
  test('capitalizes each word', () => {
    expect(title('hello world')).toBe('Hello World');
  });

  test('keeps small grammar words lowercase mid-sentence', () => {
    expect(title('the cat in the hat')).toBe('The Cat in the Hat');
  });

  test('always capitalizes the first word even if it is a small word', () => {
    expect(title('the cat')).toBe('The Cat');
  });

  test('handles JSON array input', () => {
    expect(title('["hello world","foo bar"]')).toBe('["Hello World","Foo Bar"]');
  });

  test('returns "null" unchanged for JSON null input', () => {
    // JSON null is a valid parse result — JSON.stringify(null) produces the
    // literal string 'null' (no title-casing applied because processValue
    // returns null unchanged for non-string, non-array, non-object values).
    expect(title('null')).toBe('null');
  });
});
