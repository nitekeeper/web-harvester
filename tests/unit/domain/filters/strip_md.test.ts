import { describe, test, expect } from 'vitest';

import { strip_md } from '@domain/filters/strip_md';

describe('strip_md filter', () => {
  test('removes bold markup', () => {
    expect(strip_md('**hello**')).toBe('hello');
  });

  test('removes italic markup', () => {
    expect(strip_md('*hello*')).toBe('hello');
  });

  test('removes headers', () => {
    expect(strip_md('# Hello')).toBe('Hello');
  });

  test('removes inline code', () => {
    expect(strip_md('`code`')).toBe('code');
  });

  test('removes link markup but keeps text', () => {
    expect(strip_md('[hello](https://x.com)')).toBe('hello');
  });

  test('removes wikilinks', () => {
    expect(strip_md('[[Page|Display]]')).toBe('Display');
  });

  test('returns plain text unchanged', () => {
    expect(strip_md('hello world')).toBe('hello world');
  });
});
