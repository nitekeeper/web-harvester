import { describe, it, expect, vi } from 'vitest';

import {
  handleStartCssPickerMessage,
  handleCssPickerResultMessage,
} from '@presentation/background/wiring';
import type { CssPickerResultMessage } from '@shared/messages';
import { CSS_PICKER_RESULT_KEY, MSG_CSS_PICKER_RESULT } from '@shared/messages';

function makeTabAdapter() {
  return {
    getWebPageTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
    sendMessageToTab: vi.fn().mockResolvedValue(undefined),
  };
}

function makeStorageAdapter() {
  const store = new Map<string, unknown>();
  return {
    getLocal: vi.fn(async (key: string) => store.get(key)),
    setLocal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
}

describe('handleStartCssPickerMessage', () => {
  it('sends START_CSS_PICKER to the web page tab (not the active/settings tab)', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStartCssPickerMessage(adapter, sendResponse);
    expect(adapter.sendMessageToTab).toHaveBeenCalledWith(42, { type: 'START_CSS_PICKER' });
  });

  it('calls sendResponse with ok: true after dispatch', async () => {
    const adapter = makeTabAdapter();
    const sendResponse = vi.fn();
    await handleStartCssPickerMessage(adapter, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('propagates errors from getWebPageTab when no web tab is available', async () => {
    const adapter = {
      getWebPageTab: vi.fn().mockRejectedValue(new Error('No web page tab found')),
      sendMessageToTab: vi.fn(),
    };
    const sendResponse = vi.fn();
    await expect(handleStartCssPickerMessage(adapter, sendResponse)).rejects.toThrow(
      'No web page tab found',
    );
    expect(adapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});

describe('handleCssPickerResultMessage', () => {
  it('writes selector and timestamp to local storage under CSS_PICKER_RESULT_KEY', async () => {
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    const fakeNow = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValueOnce(fakeNow);
    const msg: CssPickerResultMessage = {
      type: MSG_CSS_PICKER_RESULT,
      selector: '.article > p',
    };
    await handleCssPickerResultMessage(msg, storage, sendResponse);
    expect(storage.setLocal).toHaveBeenCalledWith(CSS_PICKER_RESULT_KEY, {
      selector: '.article > p',
      timestamp: fakeNow,
    });
  });

  it('calls sendResponse with ok: true after storing the result', async () => {
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    const msg: CssPickerResultMessage = {
      type: MSG_CSS_PICKER_RESULT,
      selector: 'h1',
    };
    await handleCssPickerResultMessage(msg, storage, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('stores a numeric timestamp field', async () => {
    const storage = makeStorageAdapter();
    const sendResponse = vi.fn();
    const msg: CssPickerResultMessage = {
      type: MSG_CSS_PICKER_RESULT,
      selector: 'main',
    };
    await handleCssPickerResultMessage(msg, storage, sendResponse);
    const stored = storage.setLocal.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(typeof stored['timestamp']).toBe('number');
  });
});
