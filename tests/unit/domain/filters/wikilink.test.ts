import { describe, test, expect } from 'vitest';

import { wikilink } from '@domain/filters/wikilink';

describe('wikilink filter', () => {
  test('wraps a plain string', () => {
    expect(wikilink('Page Name')).toBe('[[Page Name]]');
  });

  test('uses an alias when provided', () => {
    expect(wikilink('Page Name', '"Display"')).toBe('[[Page Name|Display]]');
  });

  test('processes a JSON array of strings', () => {
    expect(wikilink('["Page A","Page B"]')).toBe('["[[Page A]]","[[Page B]]"]');
  });

  test('processes a JSON object as key|value links', () => {
    expect(wikilink('{"PageA":"Display A"}')).toBe('["[[PageA|Display A]]"]');
  });

  test('returns whitespace-only input unchanged', () => {
    expect(wikilink('   ')).toBe('   ');
  });

  test('drops non-string leaf values from JSON object', () => {
    // flattenObjectEntries drops numeric/boolean leaves (unlike old String(value) coercion)
    expect(wikilink('{"PageA":true}')).toBe('[]');
  });

  test('returns input unchanged for JSON null', () => {
    // JSON null is a valid parse result — not wrapped as a wikilink
    expect(wikilink('null')).toBe('null');
  });
});
