import { describe, test, expect } from 'vitest';

import { callout } from '@domain/filters/callout';

describe('callout filter', () => {
  test('defaults to info type when no param given', () => {
    expect(callout('hello')).toBe('> [!info]\n> hello');
  });

  test('uses provided callout type', () => {
    expect(callout('warn me', 'warning')).toBe('> [!warning]\n> warn me');
  });

  test('appends a title when provided', () => {
    expect(callout('body', '("info","Title")')).toBe('> [!info] Title\n> body');
  });

  test('encodes folded state', () => {
    expect(callout('body', '("info","Title","true")')).toBe('> [!info]- Title\n> body');
  });

  test('handles multi-line input', () => {
    expect(callout('a\nb')).toBe('> [!info]\n> a\n> b');
  });
});
