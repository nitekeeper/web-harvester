import { describe, expect, it } from 'vitest';

import { isClipPageMessage, MSG_CLIP } from '@shared/messages';

describe('isClipPageMessage', () => {
  it('returns true for a valid ClipPageMessage', () => {
    expect(isClipPageMessage({ type: MSG_CLIP, destinationId: 'dest-1' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isClipPageMessage(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isClipPageMessage('clip')).toBe(false);
  });

  it('returns false when type field is missing', () => {
    expect(isClipPageMessage({ destinationId: 'dest-1' })).toBe(false);
  });

  it('returns false when type is a different string', () => {
    expect(isClipPageMessage({ type: 'getHtml', destinationId: 'dest-1' })).toBe(false);
  });

  it('returns false when destinationId is missing', () => {
    expect(isClipPageMessage({ type: MSG_CLIP })).toBe(false);
  });

  it('returns false when destinationId is not a string', () => {
    expect(isClipPageMessage({ type: MSG_CLIP, destinationId: 42 })).toBe(false);
  });
});
