import { describe, it, expect } from 'vitest';

import {
  parseFrontmatter,
  serializeFrontmatter,
} from '@presentation/settings/sections/templates/frontmatterUtils';

describe('parseFrontmatter', () => {
  it('parses a multi-line YAML string into key/value rows', () => {
    const yaml = 'title: {{page.title}}\nurl: {{page.url}}\nauthor: {{meta.author}}';
    const rows = parseFrontmatter(yaml);
    expect(rows).toEqual([
      { key: 'title', value: '{{page.title}}' },
      { key: 'url', value: '{{page.url}}' },
      { key: 'author', value: '{{meta.author}}' },
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseFrontmatter('')).toEqual([]);
  });

  it('ignores blank lines', () => {
    const rows = parseFrontmatter('title: hello\n\nurl: world');
    expect(rows).toHaveLength(2);
  });

  it('treats the first colon as the key/value separator', () => {
    const rows = parseFrontmatter('filter: date("YYYY:MM:DD")');
    expect(rows[0]).toEqual({ key: 'filter', value: 'date("YYYY:MM:DD")' });
  });
});

describe('serializeFrontmatter', () => {
  it('joins rows into a YAML string', () => {
    const rows = [
      { key: 'title', value: '{{page.title}}' },
      { key: 'url', value: '{{page.url}}' },
    ];
    expect(serializeFrontmatter(rows)).toBe('title: {{page.title}}\nurl: {{page.url}}');
  });

  it('returns an empty string for an empty array', () => {
    expect(serializeFrontmatter([])).toBe('');
  });
});

describe('roundtrip', () => {
  it('parse → serialize produces the original string', () => {
    const yaml = 'title: {{page.title}}\nurl: {{page.url}}\nauthor: {{meta.author | "unknown"}}';
    expect(serializeFrontmatter(parseFrontmatter(yaml))).toBe(yaml);
  });
});
