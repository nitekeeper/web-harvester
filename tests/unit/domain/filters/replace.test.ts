import { describe, test, expect } from 'vitest';

import { replace } from '@domain/filters/replace';

describe('replace filter', () => {
  test('replaces a literal substring', () => {
    expect(replace('hello world', '"world":"there"')).toBe('hello there');
  });

  test('replaces all occurrences', () => {
    expect(replace('a-b-c', '"-":"_"')).toBe('a_b_c');
  });

  test('uses a regex pattern (quoted form)', () => {
    expect(replace('hello123world', '"/\\d+/g":"-"')).toBe('hello-world');
  });

  test('chains multiple replacements with comma', () => {
    expect(replace('foo bar baz', '"foo":"x","bar":"y"')).toBe('x y baz');
  });

  test('handles empty replacement (deletion)', () => {
    expect(replace('hello world', '"world":""')).toBe('hello ');
  });

  test('handles escape sequences in replacement', () => {
    expect(replace('a-b', '"-":"\\n"')).toBe('a\nb');
  });

  test('returns input unchanged when no param given', () => {
    expect(replace('hello')).toBe('hello');
  });

  test('handles pipe character', () => {
    expect(replace('a|b|c', '"|":"-"')).toBe('a-b-c');
  });

  test('treats pipe inside a multi-character search as a literal character', () => {
    // Regression guard: old escapeRegex omitted | so 'a|b' became alternation (/a|b/g),
    // replacing every 'a' and 'b'. Now it correctly matches only the literal 'a|b'.
    expect(replace('a|b cat', '"a|b":"X"')).toBe('X cat');
  });
});
