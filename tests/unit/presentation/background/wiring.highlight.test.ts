import { describe, it, expect, vi } from 'vitest';

import {
  handleStartHighlightMessage,
  handleStopHighlightMessage,
  handleHighlightModeExitedMessage,
} from '@presentation/background/wiring';

function makeTabAdapter() {
  return {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
    sendMessageToTab: vi.fn().mockResolvedValue(undefined),
  };
}

const POPUP_STATE_KEY = 'popup-state';

function makeStorageAdapter(existingState: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>([[POPUP_STATE_KEY, existingState]]);
  return {
    getLocal: vi.fn(async (key: string) => store.get(key)),
    setLocal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
}

describe('handleStartHighlightMessage', () => {
  it('sends START_HIGHLIGHT to the active tab', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStartHighlightMessage(adapter, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, { type: 'START_HIGHLIGHT' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('calls sendResponse with ok: false when tab id is undefined', async () => {
    const adapter = {
      getActiveTab: vi.fn().mockResolvedValue({ id: undefined }),
      sendMessageToTab: vi.fn(),
    };
    const sendResponse = vi.fn();
    await handleStartHighlightMessage(adapter, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(adapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});

describe('handleStopHighlightMessage', () => {
  it('sends STOP_HIGHLIGHT to the active tab', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStopHighlightMessage(adapter, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, { type: 'STOP_HIGHLIGHT' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});

describe('handleHighlightModeExitedMessage', () => {
  it('sets isHighlightActive to false in popup-state storage', async () => {
    const storage = makeStorageAdapter({ isHighlightActive: true, otherField: 'preserved' });
    const sendResponse = vi.fn();
    await handleHighlightModeExitedMessage(storage, sendResponse);
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({ isHighlightActive: false, otherField: 'preserved' }),
    );
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('handles missing popup-state gracefully', async () => {
    const storage = makeStorageAdapter();
    storage.getLocal.mockResolvedValueOnce(undefined);
    const sendResponse = vi.fn();
    await handleHighlightModeExitedMessage(storage, sendResponse);
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({ isHighlightActive: false }),
    );
  });
});
