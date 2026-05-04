import { describe, test, expect } from 'vitest';

import { blockquote } from '@domain/filters/blockquote';

describe('blockquote filter', () => {
  test('prefixes a single line with "> "', () => {
    expect(blockquote('hello')).toBe('> hello');
  });

  test('prefixes multi-line strings on each line', () => {
    expect(blockquote('line1\nline2')).toBe('> line1\n> line2');
  });

  test('joins JSON arrays as separate quoted lines', () => {
    expect(blockquote('["a","b"]')).toBe('> a\n> b');
  });

  test('uses deeper prefix for nested arrays', () => {
    expect(blockquote('["a",["b","c"]]')).toBe('> a\n> > b\n> > c');
  });

  test('formats objects as pretty-printed JSON inside the quote', () => {
    expect(blockquote('{"a":1}')).toBe('> {\n>   "a": 1\n> }');
  });
});
