import { describe, it, expect } from 'vitest';

import {
  normalizeUrl,
  groupHighlights,
  collapseGroupsForExport,
  BLOCK_HIGHLIGHT_TAGS,
  EPHEMERAL_PARAMS,
  type TextHighlightData,
} from '@shared/highlighter';

function makeText(overrides: Partial<TextHighlightData> = {}): TextHighlightData {
  return {
    type: 'text',
    id: 'h1',
    xpath: '/html/body/p[1]',
    content: '<p>hello</p>',
    text: 'hello',
    startOffset: 0,
    endOffset: 5,
    ...overrides,
  };
}

describe('normalizeUrl', () => {
  it('strips utm_ tracking parameters', () => {
    expect(normalizeUrl('https://example.com/post?utm_source=twitter')).toBe(
      'https://example.com/post',
    );
  });

  it('strips fragment identifiers', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('preserves meaningful query params', () => {
    expect(normalizeUrl('https://example.com/search?q=foo&page=2')).toBe(
      'https://example.com/search?q=foo&page=2',
    );
  });

  it('returns the original string for invalid URLs', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('groupHighlights', () => {
  it('puts ungrouped highlights in their own single-element arrays', () => {
    const h1 = makeText({ id: 'h1' });
    const h2 = makeText({ id: 'h2' });
    const groups = groupHighlights([h1, h2]);
    expect(groups).toHaveLength(2);
  });

  it('groups highlights with the same groupId together', () => {
    const h1 = makeText({ id: 'h1', groupId: 'g1' });
    const h2 = makeText({ id: 'h2', groupId: 'g1' });
    const groups = groupHighlights([h1, h2]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });
});

describe('collapseGroupsForExport', () => {
  it('returns one ExportedHighlight per ungrouped highlight', () => {
    const h = makeText({ content: '<p>hello world</p>' });
    const result = collapseGroupsForExport([h]);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('<p>hello world</p>');
  });
});

describe('BLOCK_HIGHLIGHT_TAGS', () => {
  it('contains expected block-level tags', () => {
    expect(BLOCK_HIGHLIGHT_TAGS.has('FIGURE')).toBe(true);
    expect(BLOCK_HIGHLIGHT_TAGS.has('TABLE')).toBe(true);
  });
});

describe('EPHEMERAL_PARAMS', () => {
  it('contains utm_source and fbclid', () => {
    expect(EPHEMERAL_PARAMS.has('utm_source')).toBe(true);
    expect(EPHEMERAL_PARAMS.has('fbclid')).toBe(true);
  });
});
