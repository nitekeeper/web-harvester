import { describe, it, expect } from 'vitest';

import { isPreviewPageMessage, isClipPageMessage, MSG_PREVIEW } from '@shared/messages';

describe('isPreviewPageMessage', () => {
  it('returns true for a valid PreviewPageMessage', () => {
    expect(isPreviewPageMessage({ type: MSG_PREVIEW })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPreviewPageMessage(null)).toBe(false);
  });

  it('returns false for a ClipPageMessage', () => {
    expect(isPreviewPageMessage({ type: 'clip', destinationId: 'd1' })).toBe(false);
  });
});

describe('isClipPageMessage with previewMarkdown', () => {
  it('accepts ClipPageMessage without previewMarkdown', () => {
    expect(isClipPageMessage({ type: 'clip', destinationId: 'd1' })).toBe(true);
  });

  it('accepts ClipPageMessage with previewMarkdown', () => {
    expect(isClipPageMessage({ type: 'clip', destinationId: 'd1', previewMarkdown: '# hi' })).toBe(
      true,
    );
  });
});
