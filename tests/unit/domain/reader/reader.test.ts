// tests/unit/domain/reader/reader.test.ts

import { describe, it, expect } from 'vitest';

import { defaultReaderSettings, parseReaderUrl, buildReaderTitle } from '@domain/reader/reader';

describe('defaultReaderSettings', () => {
  it('returns an object with required fields', () => {
    const s = defaultReaderSettings();
    expect(typeof s.fontSize).toBe('number');
    expect(typeof s.lineHeight).toBe('number');
    expect(typeof s.maxWidth).toBe('number');
  });

  it('fontSize defaults to 16', () => {
    expect(defaultReaderSettings().fontSize).toBe(16);
  });

  it('lineHeight defaults to 1.6', () => {
    expect(defaultReaderSettings().lineHeight).toBe(1.6);
  });
});

describe('parseReaderUrl', () => {
  it('extracts the article URL from a reader page URL', () => {
    const readerUrl =
      'chrome-extension://abcdef/reader.html?url=https%3A%2F%2Fexample.com%2Farticle';
    const result = parseReaderUrl(readerUrl);
    expect(result).not.toBeNull();
    expect(result?.articleUrl).toBe('https://example.com/article');
  });

  it('returns null when the url param is missing', () => {
    const result = parseReaderUrl('chrome-extension://abcdef/reader.html');
    expect(result).toBeNull();
  });

  it('returns null for an invalid URL string', () => {
    const result = parseReaderUrl('not-a-url');
    expect(result).toBeNull();
  });
});

describe('buildReaderTitle', () => {
  const TITLE = 'My Article';

  it('formats title with site name separated by em dash', () => {
    expect(buildReaderTitle(TITLE, 'Example.com')).toBe('My Article — Example.com');
  });

  it('returns just the title when no site name is given', () => {
    expect(buildReaderTitle(TITLE)).toBe(TITLE);
  });

  it('returns just the title when site name is empty string', () => {
    expect(buildReaderTitle(TITLE, '')).toBe(TITLE);
  });
});
