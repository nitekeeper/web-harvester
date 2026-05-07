import { describe, expect, it, vi } from 'vitest';

import { handleToggleReaderMessage } from '@presentation/background/wiring';

function makeMocks() {
  const readerService = {
    toggle: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(false),
    getState: vi.fn(),
  };
  const tabAdapter = {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
  };
  const sendResponse = vi.fn();
  return { readerService, tabAdapter, sendResponse };
}

describe('handleToggleReaderMessage', () => {
  it('calls readerService.toggle with the active tab id', async () => {
    const { readerService, tabAdapter, sendResponse } = makeMocks();
    await handleToggleReaderMessage(tabAdapter, readerService, sendResponse);
    expect(readerService.toggle).toHaveBeenCalledWith(42);
  });

  it('calls sendResponse with ok: true on success', async () => {
    const { readerService, tabAdapter, sendResponse } = makeMocks();
    await handleToggleReaderMessage(tabAdapter, readerService, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('calls sendResponse with ok: false when tab id is undefined', async () => {
    const { readerService, sendResponse } = makeMocks();
    const tabAdapter = { getActiveTab: vi.fn().mockResolvedValue({ id: undefined }) };
    await handleToggleReaderMessage(tabAdapter, readerService, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false });
    expect(readerService.toggle).not.toHaveBeenCalled();
  });
});
