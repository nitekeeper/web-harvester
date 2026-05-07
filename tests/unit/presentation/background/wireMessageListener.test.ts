// tests/unit/presentation/background/wireMessageListener.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { IClipService, ClipResult, ClipAborted } from '@application/ClipService';
import { handleClipMessage, wireMessageListener } from '@presentation/background/wiring';
import { MSG_CLIP, type ClipPageMessage } from '@shared/messages';

/** Minimal tab adapter stub used by handleClipMessage. */
function makeTabAdapter() {
  return {
    getActiveTab: vi
      .fn()
      .mockResolvedValue({ id: 7, url: 'https://example.com', title: 'Example' }),
  };
}

/** Builds a mock IClipService whose `clip` returns a successful ClipResult by default. */
function makeClipService(overrides: Partial<IClipService> = {}): IClipService {
  return {
    clip: vi.fn().mockResolvedValue({
      fileName: 'note.md',
      destination: 'Inbox',
    } satisfies ClipResult),
    preview: vi.fn().mockResolvedValue(''),
    ...overrides,
  };
}

const CLIP_MSG: ClipPageMessage = { type: MSG_CLIP, destinationId: 'dest-1' };

// ── handleClipMessage ────────────────────────────────────────────────────────

describe('handleClipMessage success path', () => {
  it('calls clipService.clip with tabId from getActiveTab and the given destinationId', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService();
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG, adapter, clipService, sendResponse);

    expect(clipService.clip).toHaveBeenCalledWith({
      tabId: 7,
      destinationId: 'dest-1',
      previewMarkdown: undefined,
    });
  });

  it('calls sendResponse with ok:true and clip result on success', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService();
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG, adapter, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      fileName: 'note.md',
      destination: 'Inbox',
    });
  });
});

describe('handleClipMessage failure paths', () => {
  it('calls sendResponse with ok:false when clip returns ClipAborted', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService({
      clip: vi.fn().mockResolvedValue({
        aborted: true,
        reason: 'beforeSave hook returned false',
      } satisfies ClipAborted),
    });
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG, adapter, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'beforeSave hook returned false',
    });
  });

  it('calls sendResponse with ok:false when clipService.clip throws', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService({
      clip: vi.fn().mockRejectedValue(new Error('destination not found')),
    });
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG, adapter, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: 'destination not found',
    });
  });
});

// ── wireMessageListener ──────────────────────────────────────────────────────

/** Minimal IReaderService stub for wireMessageListener tests. */
function makeReaderService() {
  return {
    toggle: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(false),
    getState: vi.fn(),
  };
}

describe('wireMessageListener', () => {
  it('registers exactly one onMessage handler', () => {
    const adapter = { onMessage: vi.fn(), getActiveTab: vi.fn() };
    wireMessageListener(adapter, makeClipService(), makeReaderService());
    expect(adapter.onMessage).toHaveBeenCalledTimes(1);
  });

  it('does not call clipService for non-clip messages', () => {
    let capturedHandler: ((msg: unknown, sendResponse: (r?: unknown) => void) => void) | undefined;
    const adapter = {
      onMessage: vi.fn((h: (msg: unknown, sr: (r?: unknown) => void) => void) => {
        capturedHandler = h;
      }),
      getActiveTab: vi.fn(),
    };
    const clipService = makeClipService();

    wireMessageListener(adapter, clipService, makeReaderService());
    capturedHandler?.({ type: 'getHtml' }, vi.fn());

    expect(clipService.clip).not.toHaveBeenCalled();
  });
});
