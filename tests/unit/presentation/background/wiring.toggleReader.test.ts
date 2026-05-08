import { describe, expect, it, vi } from 'vitest';

import { defaultReaderSettings } from '@application/ReaderService';
import { handleToggleReaderMessage } from '@presentation/background/wiring';
import type { ToggleReaderMessage } from '@shared/messages';
import { MSG_TOGGLE_READER } from '@shared/messages';

function makeMsg(overrides: Partial<ToggleReaderMessage> = {}): ToggleReaderMessage {
  return {
    type: MSG_TOGGLE_READER,
    settings: defaultReaderSettings(),
    activate: true,
    ...overrides,
  };
}

function makeMocks() {
  const tabAdapter = {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
    sendMessageToTab: vi.fn().mockResolvedValue(undefined),
  };
  const sendResponse = vi.fn();
  return { tabAdapter, sendResponse };
}

describe('handleToggleReaderMessage', () => {
  it('sends READER_ACTIVATE to the tab when activate is true', async () => {
    const { tabAdapter, sendResponse } = makeMocks();
    const settings = defaultReaderSettings();
    await handleToggleReaderMessage(
      tabAdapter,
      makeMsg({ settings, activate: true }),
      sendResponse,
    );
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'READER_ACTIVATE',
      settings,
    });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('sends READER_DEACTIVATE to the tab when activate is false', async () => {
    const { tabAdapter, sendResponse } = makeMocks();
    await handleToggleReaderMessage(tabAdapter, makeMsg({ activate: false }), sendResponse);
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalledWith(42, { type: 'READER_DEACTIVATE' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('calls sendResponse with ok: false when tab id is undefined', async () => {
    const tabAdapter = {
      getActiveTab: vi.fn().mockResolvedValue({ id: undefined }),
      sendMessageToTab: vi.fn().mockResolvedValue(undefined),
    };
    const sendResponse = vi.fn();
    await handleToggleReaderMessage(tabAdapter, makeMsg(), sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(tabAdapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});
