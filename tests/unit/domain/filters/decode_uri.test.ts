import { describe, test, expect } from 'vitest';

import { decode_uri } from '@domain/filters/decode_uri';

describe('decode_uri filter', () => {
  test('decodes percent-encoded characters', () => {
    expect(decode_uri('hello%20world')).toBe('hello world');
  });

  test('decodes encoded UTF-8', () => {
    expect(decode_uri('caf%C3%A9')).toBe('café');
  });

  test('returns input unchanged on malformed URI', () => {
    expect(decode_uri('%E0%A4%A')).toBe('%E0%A4%A');
  });

  test('returns empty string unchanged', () => {
    expect(decode_uri('')).toBe('');
  });
});
