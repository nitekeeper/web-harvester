import { describe, test, expect } from 'vitest';

import { link } from '@domain/filters/link';

describe('link filter', () => {
  test('wraps a plain URL in markdown link with default text', () => {
    expect(link('https://example.com')).toBe('[link](https://example.com)');
  });

  test('uses a custom link text', () => {
    expect(link('https://example.com', '"home"')).toBe('[home](https://example.com)');
  });

  test('formats a JSON object as key/value link list', () => {
    expect(link('{"https://a.com":"A","https://b.com":"B"}')).toBe(
      '[A](https://a.com)\n[B](https://b.com)',
    );
  });

  test('formats a JSON array of strings', () => {
    expect(link('["https://a.com","https://b.com"]', '"go"')).toBe(
      '[go](https://a.com)\n[go](https://b.com)',
    );
  });

  test('encodes spaces in URLs', () => {
    expect(link('https://example.com/a b')).toBe('[link](https://example.com/a%20b)');
  });

  test('returns whitespace-only input unchanged', () => {
    expect(link('   ')).toBe('   ');
  });

  test('drops non-string leaf values from JSON object', () => {
    // flattenObjectEntries drops numeric/boolean leaves (unlike old String(value) coercion);
    // link joins the resulting empty entry list with '\n', so the output is an empty string.
    expect(link('{"https://example.com":42}')).toBe('');
  });

  test('returns input unchanged for JSON null', () => {
    // JSON null is a valid parse result — not wrapped as a link
    expect(link('null')).toBe('null');
  });
});
