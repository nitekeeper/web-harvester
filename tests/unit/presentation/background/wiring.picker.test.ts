import { describe, it, expect, vi } from 'vitest';

import { handleStartPickerMessage, handleStopPickerMessage } from '@presentation/background/wiring';
import type { StartPickerMessage } from '@shared/messages';
import { MSG_START_PICKER } from '@shared/messages';

const POPUP_STATE_KEY = 'popup-state';

function makeTabAdapter(
  pickerResponse: { type: string; result?: unknown } = { type: 'PICKER_CANCELLED' },
) {
  return {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
    sendMessageToTab: vi.fn().mockResolvedValue(pickerResponse),
  };
}

function makeStorageAdapter(existingState: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>([[POPUP_STATE_KEY, existingState]]);
  return {
    getLocal: vi.fn(async (key: string) => store.get(key)),
    setLocal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
}

const START_MSG: StartPickerMessage = { type: MSG_START_PICKER, mode: 'exclude' };

describe('handleStartPickerMessage', () => {
  it('sends START_PICKER to the active tab with the specified mode', async () => {
    const adapter = makeTabAdapter();
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, storage, START_MSG, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'START_PICKER',
      mode: 'exclude',
    });
  });

  it('responds ok: true immediately (before picker is done)', async () => {
    const adapter = makeTabAdapter();
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, storage, START_MSG, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('responds ok: false when tab id is undefined', async () => {
    const adapter = {
      getActiveTab: vi.fn().mockResolvedValue({ id: undefined }),
      sendMessageToTab: vi.fn(),
    };
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, storage, START_MSG, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(adapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});

describe('handleStartPickerMessage — async storage updates', () => {
  it('stores pickerResult and isPickerActive: false in popup-state when PICKER_DONE', async () => {
    const adapter = makeTabAdapter({
      type: 'PICKER_DONE',
      result: { excludedXPaths: ['/html/body/div'] },
    });
    const storage = makeStorageAdapter({ isPickerActive: true, otherField: 'preserved' });
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, storage, START_MSG, sendResponse);
    // drain microtask queue so the .then() fires
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({
        isPickerActive: false,
        pickerResult: { excludedXPaths: ['/html/body/div'] },
        otherField: 'preserved',
      }),
    );
  });

  it('stores isPickerActive: false but no pickerResult when PICKER_CANCELLED', async () => {
    const adapter = makeTabAdapter({ type: 'PICKER_CANCELLED' });
    const storage = makeStorageAdapter({ isPickerActive: true });
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, storage, START_MSG, sendResponse);
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.not.objectContaining({ pickerResult: expect.anything() }),
    );
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({ isPickerActive: false }),
    );
  });
});

describe('handleStopPickerMessage', () => {
  it('sends STOP_PICKER to the active tab', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStopPickerMessage(adapter, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, { type: 'STOP_PICKER' });
  });

  it('responds ok: true on success', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStopPickerMessage(adapter, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('responds ok: false when tab id is undefined', async () => {
    const adapter = {
      getActiveTab: vi.fn().mockResolvedValue({ id: undefined }),
      sendMessageToTab: vi.fn(),
    };
    const sendResponse = vi.fn();
    await handleStopPickerMessage(adapter, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(adapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});
