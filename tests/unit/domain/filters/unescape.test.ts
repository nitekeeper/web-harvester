import { describe, test, expect } from 'vitest';

import { unescape } from '@domain/filters/unescape';

describe('unescape filter', () => {
  test('unescapes escaped quotes', () => {
    expect(unescape('he said \\"hi\\"')).toBe('he said "hi"');
  });

  test('unescapes literal \\n into newline', () => {
    expect(unescape('line1\\nline2')).toBe('line1\nline2');
  });

  test('returns empty string unchanged', () => {
    expect(unescape('')).toBe('');
  });
});
