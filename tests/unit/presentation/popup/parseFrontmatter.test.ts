import { describe, it, expect } from 'vitest';

import {
  parseFrontmatterFields,
  rebuildMarkdownWithFields,
  type FrontmatterField,
} from '@presentation/popup/lib/parseFrontmatter';

describe('parseFrontmatterFields', () => {
  it('returns empty array when markdown has no frontmatter', () => {
    expect(parseFrontmatterFields('# Hello\n\nBody.')).toEqual([]);
  });

  it('returns empty array when markdown is an empty string', () => {
    expect(parseFrontmatterFields('')).toEqual([]);
  });

  it('parses simple key: value pairs', () => {
    const md = '---\ntitle: My Page\ndate: 2026-05-06\n---\n\n# Body';
    expect(parseFrontmatterFields(md)).toEqual([
      { key: 'title', value: 'My Page' },
      { key: 'date', value: '2026-05-06' },
    ]);
  });

  it('trims whitespace from keys and values', () => {
    const md = '---\n  author:   Jane Doe  \n---\n';
    expect(parseFrontmatterFields(md)).toEqual([{ key: 'author', value: 'Jane Doe' }]);
  });

  it('returns empty array when closing fence is missing', () => {
    const md = '---\ntitle: My Page\n';
    expect(parseFrontmatterFields(md)).toEqual([]);
  });

  it('skips lines that contain no colon', () => {
    const md = '---\ntitle: My Page\nnot-a-field\ntags: foo\n---\n';
    expect(parseFrontmatterFields(md)).toEqual([
      { key: 'title', value: 'My Page' },
      { key: 'tags', value: 'foo' },
    ]);
  });
});

describe('rebuildMarkdownWithFields', () => {
  it('returns markdown unchanged when there is no frontmatter', () => {
    const md = '# Hello\n\nBody.';
    const fields: FrontmatterField[] = [{ key: 'title', value: 'Test' }];
    expect(rebuildMarkdownWithFields(md, fields)).toBe(md);
  });

  it('replaces frontmatter values with updated field values', () => {
    const md = '---\ntitle: Old\ndate: 2020-01-01\n---\n\n# Body';
    const result = rebuildMarkdownWithFields(md, [
      { key: 'title', value: 'New Title' },
      { key: 'date', value: '2026-05-06' },
    ]);
    expect(result).toBe('---\ntitle: New Title\ndate: 2026-05-06\n---\n\n# Body');
  });

  it('preserves the body section below the closing fence', () => {
    const md = '---\ntitle: T\n---\n\n## Heading\n\nParagraph.';
    const result = rebuildMarkdownWithFields(md, [{ key: 'title', value: 'T2' }]);
    expect(result).toContain('## Heading');
    expect(result).toContain('Paragraph.');
  });
});
