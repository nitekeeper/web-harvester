import { describe, it, expect } from 'vitest';

import {
  normalizeUrl,
  groupHighlights,
  collapseGroupsForExport,
  BLOCK_HIGHLIGHT_TAGS,
  EPHEMERAL_PARAMS,
} from '@domain/highlighter/highlighter';
import type { TextHighlightData } from '@domain/highlighter/highlighter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeText(overrides: Partial<TextHighlightData> = {}): TextHighlightData {
  return {
    type: 'text',
    id: 'h1',
    xpath: '/html/body/p[1]',
    content: '<p>hello</p>',
    startOffset: 0,
    endOffset: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------
describe('normalizeUrl', () => {
  it('strips utm_ tracking parameters', () => {
    const url = 'https://example.com/post?utm_source=twitter&utm_medium=social';
    expect(normalizeUrl(url)).toBe('https://example.com/post');
  });

  it('strips fragment identifiers', () => {
    const url = 'https://example.com/page#section';
    expect(normalizeUrl(url)).toBe('https://example.com/page');
  });

  it('strips known ad click IDs (fbclid, gclid)', () => {
    const url = 'https://example.com/?fbclid=abc123&gclid=xyz';
    expect(normalizeUrl(url)).toBe('https://example.com/');
  });

  it('preserves meaningful query params', () => {
    const url = 'https://example.com/search?q=foo&page=2';
    expect(normalizeUrl(url)).toBe('https://example.com/search?q=foo&page=2');
  });

  it('returns the original string for invalid URLs', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

// ---------------------------------------------------------------------------
// groupHighlights
// ---------------------------------------------------------------------------
describe('groupHighlights', () => {
  it('puts ungrouped highlights in their own single-element arrays', () => {
    const h1 = makeText({ id: 'h1' });
    const h2 = makeText({ id: 'h2' });
    const groups = groupHighlights([h1, h2]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([h1]);
    expect(groups[1]).toEqual([h2]);
  });

  it('groups highlights with the same groupId together', () => {
    const h1 = makeText({ id: 'h1', groupId: 'g1' });
    const h2 = makeText({ id: 'h2', groupId: 'g1' });
    const h3 = makeText({ id: 'h3' });
    const groups = groupHighlights([h1, h2, h3]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([h1, h2]);
    expect(groups[1]).toEqual([h3]);
  });

  it('preserves insertion order of groups', () => {
    const a1 = makeText({ id: 'a1', groupId: 'a' });
    const b1 = makeText({ id: 'b1', groupId: 'b' });
    const a2 = makeText({ id: 'a2', groupId: 'a' });
    const groups = groupHighlights([a1, b1, a2]);
    expect(groups[0]?.map((h) => h.id)).toEqual(['a1', 'a2']);
    expect(groups[1]?.map((h) => h.id)).toEqual(['b1']);
  });
});

// ---------------------------------------------------------------------------
// collapseGroupsForExport
// ---------------------------------------------------------------------------
describe('collapseGroupsForExport', () => {
  it('returns one ExportedHighlight per ungrouped highlight', () => {
    const h = makeText({ content: '<p>hello world</p>' });
    const result = collapseGroupsForExport([h]);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('<p>hello world</p>');
  });

  it('coalesces grouped highlights into one entry', () => {
    const h1 = makeText({ id: 'h1', groupId: 'g', content: '<p>first</p>' });
    const h2 = makeText({ id: 'h2', groupId: 'g', content: '<p>second</p>' });
    const result = collapseGroupsForExport([h1, h2]);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toContain('first');
    expect(result[0]?.text).toContain('second');
  });

  it('merges notes from grouped highlights', () => {
    const h1 = makeText({ id: 'h1', groupId: 'g', notes: ['note A'] });
    const h2 = makeText({ id: 'h2', groupId: 'g', notes: ['note B'] });
    const result = collapseGroupsForExport([h1, h2]);
    expect(result[0]?.notes).toContain('note A');
    expect(result[0]?.notes).toContain('note B');
  });

  it('calls transformContent when provided', () => {
    const h = makeText({ content: '<p>raw</p>' });
    const result = collapseGroupsForExport([h], (c) => c.toUpperCase());
    expect(result[0]?.text).toBe('<P>RAW</P>');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('BLOCK_HIGHLIGHT_TAGS', () => {
  it('contains expected block-level tags', () => {
    expect(BLOCK_HIGHLIGHT_TAGS.has('FIGURE')).toBe(true);
    expect(BLOCK_HIGHLIGHT_TAGS.has('TABLE')).toBe(true);
    expect(BLOCK_HIGHLIGHT_TAGS.has('IMG')).toBe(true);
  });
});

describe('EPHEMERAL_PARAMS', () => {
  it('contains common tracking params', () => {
    expect(EPHEMERAL_PARAMS.has('utm_source')).toBe(true);
    expect(EPHEMERAL_PARAMS.has('fbclid')).toBe(true);
    expect(EPHEMERAL_PARAMS.has('gclid')).toBe(true);
  });
});
