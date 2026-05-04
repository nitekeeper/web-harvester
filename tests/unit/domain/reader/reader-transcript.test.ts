// tests/unit/domain/reader/reader-transcript.test.ts

import { describe, it, expect } from 'vitest';

import {
  isSentenceBoundary,
  isSoftBoundary,
  isWordBoundary,
} from '@domain/reader/reader-transcript';

describe('isSentenceBoundary', () => {
  it('returns true for period followed by whitespace', () => {
    const text = 'Hello. World';
    expect(isSentenceBoundary(text, 5, 6)).toBe(true);
  });

  it('returns true for CJK sentence-ending punctuation', () => {
    const text = '日本語。次の文';
    // index of 。 is 3, next char is 4
    expect(isSentenceBoundary(text, 3, 4)).toBe(true);
  });

  it('returns false for period not followed by whitespace', () => {
    const text = 'e.g.foo';
    expect(isSentenceBoundary(text, 3, 4)).toBe(false);
  });

  it('returns true for ASCII period at end of string', () => {
    const text = 'Done.';
    expect(isSentenceBoundary(text, 4, 5)).toBe(true);
  });

  it('returns false for a non-punctuation character', () => {
    const text = 'abc';
    expect(isSentenceBoundary(text, 0, 1)).toBe(false);
  });

  it('returns false when punctPos is out of range', () => {
    const text = 'abc';
    expect(isSentenceBoundary(text, 10, 11)).toBe(false);
  });
});

describe('isSoftBoundary', () => {
  it('returns true for comma followed by whitespace', () => {
    const text = 'one, two';
    expect(isSoftBoundary(text, 3, 4)).toBe(true);
  });

  it('returns true for CJK soft-stop characters', () => {
    const text = '一つ、二つ';
    expect(isSoftBoundary(text, 2, 3)).toBe(true);
  });

  it('returns true for comma at end of string', () => {
    const text = 'a,';
    expect(isSoftBoundary(text, 1, 2)).toBe(true);
  });

  it('returns false for a non-punctuation character', () => {
    const text = 'abc';
    expect(isSoftBoundary(text, 0, 1)).toBe(false);
  });

  it('returns false when punctPos is out of range', () => {
    const text = 'abc';
    expect(isSoftBoundary(text, 10, 11)).toBe(false);
  });
});

describe('isWordBoundary', () => {
  it('returns true when at a CJK character position', () => {
    const text = '日本語';
    expect(isWordBoundary(text, 0)).toBe(true);
    expect(isWordBoundary(text, 1)).toBe(true);
  });

  it('returns false for regular Latin characters', () => {
    const text = 'hello world';
    expect(isWordBoundary(text, 0)).toBe(false);
  });

  it('returns true at the boundary where CJK transitions to non-CJK punctuation', () => {
    // 日 is CJK at position 0, ! is non-CJK non-space at position 1
    const text = '日!';
    expect(isWordBoundary(text, 1)).toBe(true);
  });

  it('returns false when CJK is followed by whitespace', () => {
    const text = '日 ';
    expect(isWordBoundary(text, 1)).toBe(false);
  });

  it('returns false when previous char is not CJK', () => {
    const text = 'ab';
    expect(isWordBoundary(text, 1)).toBe(false);
  });

  it('returns false when pos is out of range', () => {
    const text = 'abc';
    expect(isWordBoundary(text, 10)).toBe(false);
  });
});
