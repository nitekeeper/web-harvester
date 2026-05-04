import { describe, test, expect } from 'vitest';

import { fragment_link } from '@domain/filters/fragment_link';

const URL = 'https://example.com';

describe('fragment_link filter', () => {
  test('returns the input as a JSON array string when no param', () => {
    expect(fragment_link('plain text')).toBe('["plain text"]');
  });

  test('appends a text fragment link to a JSON-string input', () => {
    const result = fragment_link('"hello world"', URL);
    expect(result).toBe('["hello world [link](https://example.com#:~:text=hello%20world)"]');
  });

  test('parses custom link text from param', () => {
    const result = fragment_link('"hello world"', '"highlight":https://example.com');
    expect(result).toContain('[highlight]');
  });

  test('handles JSON array of strings', () => {
    const result = fragment_link('["one","two"]', URL);
    expect(result).toContain('one');
    expect(result).toContain('two');
  });

  test('handles long text by using start/end fragments', () => {
    const longText = '"a b c d e f g h i j k l m n o"';
    const out = fragment_link(longText, URL);
    expect(out).toContain('a%20b%20c%20d%20e');
    expect(out).toContain('k%20l%20m%20n%20o');
  });

  test('returns input array when input is whitespace', () => {
    expect(fragment_link('   ', URL)).toBe('["   "]');
  });

  test('returns input array unchanged for non-JSON strings even with param', () => {
    expect(fragment_link('plain text', URL)).toBe('["plain text"]');
  });
});
