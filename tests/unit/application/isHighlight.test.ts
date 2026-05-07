import { describe, expect, it } from 'vitest';

import { isHighlight } from '@application/HighlightService';

const TEST_URL = 'https://example.com';

describe('isHighlight', () => {
  it('returns true for a valid Highlight object', () => {
    expect(
      isHighlight({
        id: 'h1',
        url: TEST_URL,
        text: 'Hello',
        color: 'yellow',
        xpath: '/html/body',
        createdAt: 1000,
      }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isHighlight(null)).toBe(false);
  });

  it('returns false when required string fields are missing', () => {
    expect(isHighlight({ id: 'h1', url: TEST_URL })).toBe(false);
  });

  it('returns false when id is not a string', () => {
    expect(
      isHighlight({
        id: 42,
        url: TEST_URL,
        text: 'Hello',
        color: 'yellow',
        xpath: '/html/body',
        createdAt: 1000,
      }),
    ).toBe(false);
  });

  it('returns false for a primitive', () => {
    expect(isHighlight('not an object')).toBe(false);
  });
});
