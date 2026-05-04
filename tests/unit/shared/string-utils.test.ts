import { describe, it, expect } from 'vitest';

import { sanitizeFileName, truncate, stripHtml, escapeRegex } from '@shared/string-utils';

const ELLIPSIS = '...';

describe('sanitizeFileName', () => {
  it('returns the name unchanged when already clean', () => {
    expect(sanitizeFileName('my-document')).toBe('my-document');
  });

  it('strips characters invalid in filenames', () => {
    expect(sanitizeFileName('file\\/:*?"<>|name')).toBe('filename');
  });

  it('strips control characters', () => {
    expect(sanitizeFileName('file\x00\x1Fname')).toBe('filename');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFileName('  hello  ')).toBe('hello');
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeFileName(long)).toHaveLength(200);
  });

  it('returns empty string for input that is all invalid characters', () => {
    expect(sanitizeFileName('\\/:*?"<>|')).toBe('');
  });

  it('handles empty string input', () => {
    expect(sanitizeFileName('')).toBe('');
  });
});

describe('truncate', () => {
  it('returns the string unchanged when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the string unchanged when equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when over maxLength', () => {
    expect(truncate('hello world', 8)).toBe(`hello${ELLIPSIS}`);
  });

  it('handles empty string for truncate', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('handles maxLength of 3 (minimum meaningful length)', () => {
    expect(truncate('abcdef', 3)).toBe(ELLIPSIS);
  });

  it('handles maxLength of 2 (less than ellipsis length)', () => {
    expect(truncate('abcdef', 2)).toBe('ab');
  });

  it('handles maxLength of 0', () => {
    expect(truncate('abcdef', 0)).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes a simple tag', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
  });

  it('removes self-closing tags', () => {
    expect(stripHtml('before<br/>after')).toBe('beforeafter');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('handles empty string for stripHtml', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeRegex('hello123')).toBe('hello123');
  });

  it('handles empty string for escapeRegex', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('escaped string works as a literal regex pattern', () => {
    const pattern = escapeRegex('1+1=2');
    // eslint-disable-next-line security/detect-non-literal-regexp -- intentional: validates that escapeRegex output is regex-safe
    const regex = new RegExp(pattern);
    expect(regex.test('1+1=2')).toBe(true);
    expect(regex.test('1112')).toBe(false);
  });
});
