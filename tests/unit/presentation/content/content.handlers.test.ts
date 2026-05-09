// tests/unit/presentation/content/content.handlers.test.ts
//
// Tests for chrome.runtime.onMessage handlers in the content script entry
// point. Captures the registered listener by intercepting addListener before
// the module is loaded.

import { describe, it, expect, vi } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('@presentation/content/reader', () => ({
  activateReader: vi.fn(),
  deactivateReader: vi.fn(),
}));

vi.mock('@presentation/content/defuddleParse', () => ({
  defuddleParse: vi.fn().mockReturnValue('# Article'),
}));

vi.mock('@presentation/content/highlighter', () => ({
  activateHighlighter: vi.fn(),
  deactivateHighlighter: vi.fn(),
}));

vi.mock('@presentation/content/picker', () => ({
  startPicker: vi.fn(),
}));

const addListenerMock = vi.fn() as MockInstance;
vi.stubGlobal('chrome', {
  runtime: {
    onMessage: { addListener: addListenerMock },
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
});

const { activateReader } = await import('@presentation/content/reader');
await import('@presentation/content/content');

const firstCall = addListenerMock.mock.calls[0];
if (!firstCall) throw new Error('chrome.runtime.onMessage.addListener was not called');
const listener = firstCall[0] as (
  msg: unknown,
  sender: unknown,
  sendResponse: (r: unknown) => void,
) => boolean;

const SETTINGS = {
  fontSize: 16,
  lineHeight: 1.6,
  maxWidth: 38,
  theme: 'light' as const,
  fontFamily: 'default',
  showHighlights: true,
};

describe('content script READER_ACTIVATE handler', () => {
  it('calls sendResponse with ok:true when activateReader resolves', async () => {
    vi.mocked(activateReader).mockResolvedValue(undefined);
    const sendResponse = vi.fn();

    listener({ type: 'READER_ACTIVATE', settings: SETTINGS }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });
  });

  it('calls sendResponse with ok:false when activateReader rejects', async () => {
    vi.mocked(activateReader).mockRejectedValue(new Error('activate failed'));
    const sendResponse = vi.fn();

    listener({ type: 'READER_ACTIVATE', settings: SETTINGS }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    });
  });

  it('returns true to keep the message channel open for async response', () => {
    vi.mocked(activateReader).mockResolvedValue(undefined);
    const sendResponse = vi.fn();

    const result = listener({ type: 'READER_ACTIVATE', settings: SETTINGS }, {}, sendResponse);

    expect(result).toBe(true);
  });
});
