// tests/unit/application/ClipService.preview.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ClipService, type IClipService, type ClipRequest } from '@application/ClipService';
import { createLogger } from '@shared/logger';

const ARTICLE_URL = 'https://example.com/article';
const ARTICLE_HTML = '<p>Hello world</p>';
const COMPILED_MARKDOWN = '# Hello world\n\nSome content.';

function createMockTabAdapter() {
  return {
    getActiveTab: vi.fn().mockResolvedValue({
      id: 1,
      url: ARTICLE_URL,
      title: 'Example Article',
    }),
    executeScript: vi.fn().mockResolvedValue(undefined),
    insertCSS: vi.fn().mockResolvedValue(undefined),
    sendMessageToTab: vi.fn().mockResolvedValue({ html: ARTICLE_HTML, markdown: '' }),
    onTabActivated: vi.fn(),
    onTabUpdated: vi.fn(),
  };
}

function createMockDestinationStorage() {
  return {
    add: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue({
      id: 'dest-1',
      label: 'Inbox',
      dirHandle: { name: 'Inbox' },
      fileNamePattern: '{date} {title}.md',
      createdAt: Date.now(),
    }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn(),
  };
}

function createMockNotificationAdapter() {
  return {
    showNotification: vi.fn().mockResolvedValue(undefined),
    clearNotification: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockHooks() {
  return {
    beforeClip: {
      tap: vi.fn(),
      call: vi.fn().mockImplementation(async (v: unknown) => v),
    },
    afterClip: {
      tap: vi.fn(),
      call: vi.fn().mockResolvedValue(undefined),
    },
    beforeSave: {
      tap: vi.fn(),
      call: vi.fn().mockResolvedValue(true),
    },
    afterSave: {
      tap: vi.fn(),
      call: vi.fn().mockResolvedValue(undefined),
    },
    onTemplateRender: { tap: vi.fn(), call: vi.fn() },
    onHighlight: { tap: vi.fn(), call: vi.fn() },
    onSettingsChanged: { tap: vi.fn(), call: vi.fn() },
    onThemeChanged: { tap: vi.fn(), call: vi.fn() },
  };
}

const mockSaveTo = vi.fn().mockResolvedValue('2024-01-01 Example Article.md');

let tabAdapter: ReturnType<typeof createMockTabAdapter>;
let destinationStorage: ReturnType<typeof createMockDestinationStorage>;
let notifications: ReturnType<typeof createMockNotificationAdapter>;
let hooks: ReturnType<typeof createMockHooks>;
let service: IClipService;

beforeEach(() => {
  vi.clearAllMocks();
  tabAdapter = createMockTabAdapter();
  destinationStorage = createMockDestinationStorage();
  notifications = createMockNotificationAdapter();
  hooks = createMockHooks();
  service = new ClipService(
    tabAdapter,
    destinationStorage,
    hooks,
    notifications,
    mockSaveTo,
    createLogger('test'),
  );
});

describe('ClipService.preview() — extraction and transform', () => {
  it('calls sendMessageToTab to extract page content', async () => {
    await service.preview();
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalledWith(1, { type: 'getHtml' });
  });

  it('runs the beforeClip waterfall with extracted content', async () => {
    await service.preview();
    expect(hooks.beforeClip.call).toHaveBeenCalledWith(
      expect.objectContaining({ url: ARTICLE_URL, html: ARTICLE_HTML }),
    );
  });

  it('returns the transformed content.html from beforeClip', async () => {
    hooks.beforeClip.call.mockImplementation(async (v: unknown) => ({
      ...(v as object),
      html: COMPILED_MARKDOWN,
    }));
    const result = await service.preview();
    expect(result).toBe(COMPILED_MARKDOWN);
  });

  it('returns empty string when extraction fails (graceful fallback)', async () => {
    tabAdapter.getActiveTab.mockRejectedValue(new Error('no active tab'));
    const result = await service.preview();
    expect(result).toBe('');
  });

  it('passes selectedTemplateId to beforeClip when templateId argument is provided', async () => {
    await service.preview('my-template-id');
    expect(hooks.beforeClip.call).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTemplateId: 'my-template-id' }),
    );
  });

  it('passes selectedTemplateId as undefined when no templateId argument is provided', async () => {
    await service.preview();
    expect(hooks.beforeClip.call).toHaveBeenCalledWith(
      expect.objectContaining({ selectedTemplateId: undefined }),
    );
  });
});

describe('ClipService.preview() — no side effects', () => {
  it('does NOT call saveTo', async () => {
    await service.preview();
    expect(mockSaveTo).not.toHaveBeenCalled();
  });

  it('does NOT call afterClip hook', async () => {
    await service.preview();
    expect(hooks.afterClip.call).not.toHaveBeenCalled();
  });

  it('does NOT call afterSave hook', async () => {
    await service.preview();
    expect(hooks.afterSave.call).not.toHaveBeenCalled();
  });

  it('does NOT show a notification', async () => {
    await service.preview();
    expect(notifications.showNotification).not.toHaveBeenCalled();
  });
});

describe('ClipService.clip() with previewMarkdown provided', () => {
  const previewRequest: ClipRequest = {
    tabId: 1,
    destinationId: 'dest-1',
    previewMarkdown: COMPILED_MARKDOWN,
  };

  it('skips sendMessageToTab (no extraction) when previewMarkdown is provided', async () => {
    await service.clip(previewRequest);
    expect(tabAdapter.sendMessageToTab).not.toHaveBeenCalled();
  });

  it('skips beforeClip hook when previewMarkdown is provided', async () => {
    await service.clip(previewRequest);
    expect(hooks.beforeClip.call).not.toHaveBeenCalled();
  });

  it('still runs beforeSave when previewMarkdown is provided', async () => {
    await service.clip(previewRequest);
    expect(hooks.beforeSave.call).toHaveBeenCalled();
  });

  it('still calls saveTo when previewMarkdown is provided', async () => {
    await service.clip(previewRequest);
    expect(mockSaveTo).toHaveBeenCalled();
  });

  it('uses previewMarkdown as the content passed to saveTo', async () => {
    await service.clip(previewRequest);
    expect(mockSaveTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      COMPILED_MARKDOWN,
      expect.any(String),
    );
  });
});

describe('ClipService.clip() with previewMarkdown fallback', () => {
  it('still runs afterClip hook when previewMarkdown is provided', async () => {
    const previewRequest: ClipRequest = {
      tabId: 1,
      destinationId: 'dest-1',
      previewMarkdown: COMPILED_MARKDOWN,
    };
    await service.clip(previewRequest);
    expect(hooks.afterClip.call).toHaveBeenCalled();
  });

  it('still runs afterSave hook when previewMarkdown is provided', async () => {
    const previewRequest: ClipRequest = {
      tabId: 1,
      destinationId: 'dest-1',
      previewMarkdown: COMPILED_MARKDOWN,
    };
    await service.clip(previewRequest);
    expect(hooks.afterSave.call).toHaveBeenCalled();
  });

  it('falls through to extraction when previewMarkdown is empty string', async () => {
    await service.clip({ tabId: 1, destinationId: 'dest-1', previewMarkdown: '' });
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalled();
    expect(hooks.beforeClip.call).toHaveBeenCalled();
  });
});
