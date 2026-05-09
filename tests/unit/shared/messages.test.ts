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
  isStartPickerMessage,
  isStopPickerMessage,
  MSG_START_PICKER,
  MSG_STOP_PICKER,
} from '@shared/messages';
import { defaultReaderSettings } from '@shared/reader-settings';

describe('isClipPageMessage', () => {
  it('returns true for a valid ClipPageMessage', () => {
    expect(isClipPageMessage({ type: MSG_CLIP, destinationId: 'dest-1' })).toBe(true);
  });

  it(NULL_TEST, () => {
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

describe('isToggleReaderMessage — valid messages', () => {
  it('returns true when message has type, settings, and activate: true', () => {
    const msg = { type: MSG_TOGGLE_READER, settings: defaultReaderSettings(), activate: true };
    expect(isToggleReaderMessage(msg)).toBe(true);
  });

  it('returns true when activate is false', () => {
    const msg = { type: MSG_TOGGLE_READER, settings: defaultReaderSettings(), activate: false };
    expect(isToggleReaderMessage(msg)).toBe(true);
  });
});

describe('isToggleReaderMessage — invalid messages', () => {
  it('returns false when activate is missing', () => {
    expect(
      isToggleReaderMessage({ type: MSG_TOGGLE_READER, settings: defaultReaderSettings() }),
    ).toBe(false);
  });

  it('returns false when settings is missing', () => {
    expect(isToggleReaderMessage({ type: MSG_TOGGLE_READER, activate: true })).toBe(false);
  });

  it('returns false when settings is null', () => {
    expect(isToggleReaderMessage({ type: MSG_TOGGLE_READER, settings: null, activate: true })).toBe(
      false,
    );
  });

  it('returns false when type is different', () => {
    const msg = { type: 'other-message', settings: defaultReaderSettings(), activate: true };
    expect(isToggleReaderMessage(msg)).toBe(false);
  });
});

const OTHER_TYPE = 'other';
const INVALID_TYPE_TEST = 'returns false for other types';
const NULL_TEST = 'returns false for null';

describe('isStartHighlightMessage', () => {
  it('returns true for a valid start-highlight message', () => {
    expect(isStartHighlightMessage({ type: MSG_START_HIGHLIGHT })).toBe(true);
  });

  it(INVALID_TYPE_TEST, () => {
    expect(isStartHighlightMessage({ type: OTHER_TYPE })).toBe(false);
  });

  it(NULL_TEST, () => {
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

describe('isStartPickerMessage', () => {
  it('returns true for a valid start-picker message with mode exclude', () => {
    expect(isStartPickerMessage({ type: MSG_START_PICKER, mode: 'exclude' })).toBe(true);
  });

  it('returns true for a valid start-picker message with mode include', () => {
    expect(isStartPickerMessage({ type: MSG_START_PICKER, mode: 'include' })).toBe(true);
  });

  it('returns false when mode is missing', () => {
    expect(isStartPickerMessage({ type: MSG_START_PICKER })).toBe(false);
  });

  it('returns false when type is wrong', () => {
    expect(isStartPickerMessage({ type: OTHER_TYPE, mode: 'exclude' })).toBe(false);
  });

  it(NULL_TEST, () => {
    expect(isStartPickerMessage(null)).toBe(false);
  });
});

describe('isStopPickerMessage', () => {
  it('returns true for { type: MSG_STOP_PICKER }', () => {
    expect(isStopPickerMessage({ type: MSG_STOP_PICKER })).toBe(true);
  });

  it('returns false when type is wrong', () => {
    expect(isStopPickerMessage({ type: OTHER_TYPE })).toBe(false);
  });

  it(NULL_TEST, () => {
    expect(isStopPickerMessage(null)).toBe(false);
  });
});
