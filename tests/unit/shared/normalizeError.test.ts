import { describe, expect, it } from 'vitest';

import { normalizeError } from '@shared/normalizeError';

describe('normalizeError', () => {
  it('returns err.message for Error instances', () => {
    expect(normalizeError(new Error('something went wrong'))).toBe('something went wrong');
  });

  it('returns String(err) for non-Error values', () => {
    expect(normalizeError('raw string')).toBe('raw string');
    expect(normalizeError(42)).toBe('42');
  });

  it('returns String(err) for null/undefined', () => {
    expect(normalizeError(null)).toBe('null');
    expect(normalizeError(undefined)).toBe('undefined');
  });
});
