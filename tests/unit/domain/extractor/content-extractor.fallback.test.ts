// @vitest-environment jsdom
//
// Simulates the Chrome MV3 service worker build failure where Defuddle's UMD
// bundle is not correctly transformed to ESM, leaving the default import as
// `undefined`. The guard in `extractArticleMarkdown` must handle this
// gracefully by falling back to a full-body Turndown conversion.

import { describe, expect, it, vi } from 'vitest';

const ARTICLE_URL = 'https://example.com';

vi.mock('defuddle', () => ({
  default: undefined,
}));

// Import AFTER mock is registered so the module sees `Defuddle = undefined`.
const { extractArticleMarkdown } = await import('@domain/extractor/content-extractor');

describe('extractArticleMarkdown — Defuddle unavailable', () => {
  it('returns an empty string for empty HTML even in fallback mode', () => {
    expect(extractArticleMarkdown('', ARTICLE_URL)).toBe('');
  });

  it('falls back to full-body turndown and returns non-empty content', () => {
    const html = '<html><body><p>fallback content</p></body></html>';
    const result = extractArticleMarkdown(html, ARTICLE_URL);
    expect(result).toContain('fallback content');
    expect(result.length).toBeGreaterThan(0);
  });

  it('does not throw when Defuddle is not a constructor', () => {
    const html = '<html><body><article><h1>Title</h1><p>Body</p></article></body></html>';
    expect(() => extractArticleMarkdown(html, ARTICLE_URL)).not.toThrow();
  });
});
