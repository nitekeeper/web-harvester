import { describe, it, expect, vi } from 'vitest';

import {
  handlePickerResultMessage,
  handleStartPickerMessage,
  handleStopPickerMessage,
} from '@presentation/background/wiring';
import type { PickerResultMessage, StartPickerMessage } from '@shared/messages';
import { MSG_PICKER_RESULT, MSG_START_PICKER } from '@shared/messages';

const POPUP_STATE_KEY = 'popup-state';

function makeTabAdapter() {
  return {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
    sendMessageToTab: vi.fn().mockResolvedValue(undefined),
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
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, START_MSG, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'START_PICKER',
      mode: 'exclude',
    });
  });

  it('responds ok: true immediately without waiting for picker result', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, START_MSG, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('responds ok: false when tab id is undefined', async () => {
    const adapter = {
      getActiveTab: vi.fn().mockResolvedValue({ id: undefined }),
      sendMessageToTab: vi.fn(),
    };
    const sendResponse = vi.fn();
    await handleStartPickerMessage(adapter, START_MSG, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(adapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});

describe('handlePickerResultMessage — on confirm', () => {
  it('stores isPickerActive: false, pickerResult, and preserves existing fields', async () => {
    const storage = makeStorageAdapter({ isPickerActive: true, otherField: 'preserved' });
    const sendResponse = vi.fn();
    const msg: PickerResultMessage = {
      type: MSG_PICKER_RESULT,
      result: { excludedXPaths: ['/html/body/div'] },
    };
    await handlePickerResultMessage(msg, storage, sendResponse);
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({
        isPickerActive: false,
        pickerResult: { excludedXPaths: ['/html/body/div'] },
        otherField: 'preserved',
      }),
    );
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});

describe('handlePickerResultMessage — on cancel', () => {
  it('stores isPickerActive: false but omits pickerResult', async () => {
    const storage = makeStorageAdapter({ isPickerActive: true });
    const sendResponse = vi.fn();
    await handlePickerResultMessage({ type: MSG_PICKER_RESULT }, storage, sendResponse);
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.not.objectContaining({ pickerResult: expect.anything() }),
    );
    expect(storage.setLocal).toHaveBeenCalledWith(
      POPUP_STATE_KEY,
      expect.objectContaining({ isPickerActive: false }),
    );
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('handles missing popup-state gracefully', async () => {
    const storage = makeStorageAdapter();
    storage.getLocal.mockResolvedValueOnce(undefined);
    const sendResponse = vi.fn();
    await handlePickerResultMessage({ type: MSG_PICKER_RESULT }, storage, sendResponse);
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
