import { describe, test, expect } from 'vitest';

import { footnote } from '@domain/filters/footnote';

describe('footnote filter', () => {
  test('numbers footnotes for a JSON array', () => {
    expect(footnote('["first","second"]')).toBe('[^1]: first\n\n[^2]: second');
  });

  test('uses object keys (kebabified) as footnote ids', () => {
    expect(footnote('{"firstNote":"A","secondNote":"B"}')).toBe(
      '[^first-note]: A\n\n[^second-note]: B',
    );
  });

  test('returns the input for non-JSON input', () => {
    expect(footnote('plain text')).toBe('plain text');
  });

  test('returns empty string unchanged', () => {
    expect(footnote('')).toBe('');
  });
});
