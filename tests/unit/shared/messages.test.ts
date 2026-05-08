import { describe, expect, it } from 'vitest';

import {
  isClipPageMessage,
  MSG_CLIP,
  isToggleReaderMessage,
  MSG_TOGGLE_READER,
  isStartHighlightMessage,
  isStopHighlightMessage,
  isHighlightModeExitedMessage,
  MSG_START_HIGHLIGHT,
  MSG_STOP_HIGHLIGHT,
  MSG_HIGHLIGHT_MODE_EXITED,
} from '@shared/messages';
import { defaultReaderSettings } from '@shared/reader-settings';

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

  it('accepts ClipPageMessage without previewMarkdown', () => {
    expect(isClipPageMessage({ type: 'clip', destinationId: 'd1' })).toBe(true);
  });

  it('accepts ClipPageMessage with previewMarkdown', () => {
    expect(isClipPageMessage({ type: 'clip', destinationId: 'd1', previewMarkdown: '# hi' })).toBe(
      true,
    );
  });
});

describe('isToggleReaderMessage', () => {
  it('returns true when message has type and settings', () => {
    expect(
      isToggleReaderMessage({ type: MSG_TOGGLE_READER, settings: defaultReaderSettings() }),
    ).toBe(true);
  });

  it('returns false when settings is missing', () => {
    expect(isToggleReaderMessage({ type: MSG_TOGGLE_READER })).toBe(false);
  });

  it('returns false when settings is null', () => {
    expect(isToggleReaderMessage({ type: MSG_TOGGLE_READER, settings: null })).toBe(false);
  });

  it('returns false when type is different', () => {
    expect(
      isToggleReaderMessage({ type: 'other-message', settings: defaultReaderSettings() }),
    ).toBe(false);
  });
});

const OTHER_TYPE = 'other';
const INVALID_TYPE_TEST = 'returns false for other types';

describe('isStartHighlightMessage', () => {
  it('returns true for a valid start-highlight message', () => {
    expect(isStartHighlightMessage({ type: MSG_START_HIGHLIGHT })).toBe(true);
  });

  it(INVALID_TYPE_TEST, () => {
    expect(isStartHighlightMessage({ type: OTHER_TYPE })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isStartHighlightMessage(null)).toBe(false);
  });
});

describe('isStopHighlightMessage', () => {
  it('returns true for a valid stop-highlight message', () => {
    expect(isStopHighlightMessage({ type: MSG_STOP_HIGHLIGHT })).toBe(true);
  });

  it(INVALID_TYPE_TEST, () => {
    expect(isStopHighlightMessage({ type: OTHER_TYPE })).toBe(false);
  });
});

describe('isHighlightModeExitedMessage', () => {
  it('returns true for a valid highlight-mode-exited message', () => {
    expect(isHighlightModeExitedMessage({ type: MSG_HIGHLIGHT_MODE_EXITED })).toBe(true);
  });

  it(INVALID_TYPE_TEST, () => {
    expect(isHighlightModeExitedMessage({ type: OTHER_TYPE })).toBe(false);
  });
});
