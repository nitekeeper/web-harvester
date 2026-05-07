import { describe, it, expect } from 'vitest';

import { isPreviewPageMessage, MSG_PREVIEW } from '@shared/messages';

describe('isPreviewPageMessage', () => {
  it('returns true for a valid PreviewPageMessage', () => {
    expect(isPreviewPageMessage({ type: MSG_PREVIEW, templateId: 'tpl-1' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPreviewPageMessage(null)).toBe(false);
  });

  it('returns false for a ClipPageMessage', () => {
    expect(isPreviewPageMessage({ type: 'clip', destinationId: 'd1' })).toBe(false);
  });

  it('returns false when templateId is missing', () => {
    expect(isPreviewPageMessage({ type: MSG_PREVIEW })).toBe(false);
  });

  it('returns true with null templateId', () => {
    expect(isPreviewPageMessage({ type: MSG_PREVIEW, templateId: null })).toBe(true);
  });
});
