// tests/unit/presentation/background/wiring.preview.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { IClipService } from '@application/ClipService';
import {
  handleClipMessage,
  handlePreviewMessage,
  wireMessageListener,
} from '@presentation/background/wiring';
import {
  MSG_CLIP,
  MSG_PREVIEW,
  type ClipPageMessage,
  type PreviewPageMessage,
} from '@shared/messages';

/** Minimal tab adapter stub used by handleClipMessage. */
function makeTabAdapter() {
  return {
    getActiveTab: vi
      .fn()
      .mockResolvedValue({ id: 7, url: 'https://example.com', title: 'Example' }),
  };
}

/** Builds a mock IClipService. */
function makeClipService(overrides: Partial<IClipService> = {}): IClipService {
  return {
    clip: vi.fn().mockResolvedValue({ fileName: 'note.md', destination: 'Inbox' }),
    preview: vi.fn().mockResolvedValue('## Preview'),
    ...overrides,
  };
}

/** Minimal IReaderService stub. */
function makeReaderService() {
  return {
    toggle: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(false),
    getState: vi.fn(),
  };
}

const PREVIEW_MSG: PreviewPageMessage = { type: MSG_PREVIEW, templateId: null };
const CLIP_MSG_WITH_PREVIEW: ClipPageMessage = {
  type: MSG_CLIP,
  destinationId: 'dest-1',
  previewMarkdown: '## Hello',
};
const CLIP_MSG_WITHOUT_PREVIEW: ClipPageMessage = {
  type: MSG_CLIP,
  destinationId: 'dest-1',
};

// ── handlePreviewMessage ─────────────────────────────────────────────────────

describe('handlePreviewMessage', () => {
  it('calls clipService.preview()', async () => {
    const clipService = makeClipService();
    const sendResponse = vi.fn();

    await handlePreviewMessage(PREVIEW_MSG, clipService, sendResponse);

    expect(clipService.preview).toHaveBeenCalledTimes(1);
  });

  it('sends { ok: true, previewMarkdown } on success', async () => {
    const clipService = makeClipService({
      preview: vi.fn().mockResolvedValue('## Live Preview'),
    });
    const sendResponse = vi.fn();

    await handlePreviewMessage(PREVIEW_MSG, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: true, previewMarkdown: '## Live Preview' });
  });

  it('sends { ok: false, error } on failure', async () => {
    const clipService = makeClipService({
      preview: vi.fn().mockRejectedValue(new Error('extraction failed')),
    });
    const sendResponse = vi.fn();

    await handlePreviewMessage(PREVIEW_MSG, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'extraction failed' });
  });

  it('sends { ok: false, error } as string when non-Error is thrown', async () => {
    const clipService = makeClipService({
      preview: vi.fn().mockRejectedValue('something broke'),
    });
    const sendResponse = vi.fn();

    await handlePreviewMessage(PREVIEW_MSG, clipService, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'something broke' });
  });
});

// ── handleClipMessage forwards previewMarkdown ────────────────────────────────

describe('handleClipMessage with previewMarkdown', () => {
  it('passes previewMarkdown from message to clipService.clip()', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService();
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG_WITH_PREVIEW, adapter, clipService, sendResponse);

    expect(clipService.clip).toHaveBeenCalledWith({
      tabId: 7,
      destinationId: 'dest-1',
      previewMarkdown: '## Hello',
    });
  });

  it('passes previewMarkdown as undefined when not present in message', async () => {
    const adapter = makeTabAdapter();
    const clipService = makeClipService();
    const sendResponse = vi.fn();

    await handleClipMessage(CLIP_MSG_WITHOUT_PREVIEW, adapter, clipService, sendResponse);

    expect(clipService.clip).toHaveBeenCalledWith({
      tabId: 7,
      destinationId: 'dest-1',
      previewMarkdown: undefined,
    });
  });
});

// ── wireMessageListener routes MSG_PREVIEW ───────────────────────────────────

describe('wireMessageListener MSG_PREVIEW routing', () => {
  it('routes MSG_PREVIEW to handlePreviewMessage (calls clipService.preview)', async () => {
    let capturedHandler: ((msg: unknown, sendResponse: (r?: unknown) => void) => void) | undefined;
    const adapter = {
      onMessage: vi.fn((h: (msg: unknown, sr: (r?: unknown) => void) => void) => {
        capturedHandler = h;
      }),
      getActiveTab: vi.fn(),
    };
    const clipService = makeClipService();

    wireMessageListener(adapter, clipService, makeReaderService());
    capturedHandler?.(PREVIEW_MSG, vi.fn());

    // Give the async handler a chance to run
    await Promise.resolve();

    expect(clipService.preview).toHaveBeenCalledTimes(1);
  });

  it('does not call clipService.clip for MSG_PREVIEW messages', async () => {
    let capturedHandler: ((msg: unknown, sendResponse: (r?: unknown) => void) => void) | undefined;
    const adapter = {
      onMessage: vi.fn((h: (msg: unknown, sr: (r?: unknown) => void) => void) => {
        capturedHandler = h;
      }),
      getActiveTab: vi.fn(),
    };
    const clipService = makeClipService();

    wireMessageListener(adapter, clipService, makeReaderService());
    capturedHandler?.(PREVIEW_MSG, vi.fn());

    await Promise.resolve();

    expect(clipService.clip).not.toHaveBeenCalled();
  });
});
