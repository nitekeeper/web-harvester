import { describe, test, expect } from 'vitest';

import { merge } from '@domain/filters/merge';

describe('merge filter', () => {
  test('merges additional items into a JSON array', () => {
    expect(merge('["a","b"]', '"c","d"')).toBe('["a","b","c","d"]');
  });

  test('returns original array when no param given', () => {
    expect(merge('["a","b"]')).toBe('["a","b"]');
  });

  test('treats non-array input as a single-element array', () => {
    expect(merge('"hello"', '"world"')).toBe('["\\"hello\\"","world"]');
  });

  test('returns empty JSON array for empty input', () => {
    expect(merge('')).toBe('[]');
  });
});
