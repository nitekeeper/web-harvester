// tests/unit/application/ClipService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  ClipService,
  type IClipService,
  type ClipRequest,
  DestinationNotFoundError,
} from '@application/ClipService';
import { createLogger } from '@shared/logger';

const ARTICLE_URL = 'https://example.com/article';

function createMockTabAdapter() {
  return {
    getActiveTab: vi.fn().mockResolvedValue({
      id: 1,
      url: ARTICLE_URL,
      title: 'Example Article',
    }),
    executeScript: vi.fn().mockResolvedValue(undefined),
    insertCSS: vi.fn().mockResolvedValue(undefined),
    evaluateOnTab: vi.fn().mockResolvedValue('<p>Hello</p>'),
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
    update: vi.fn(),
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

const defaultRequest: ClipRequest = {
  tabId: 1,
  destinationId: 'dest-1',
};

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

describe('ClipService — tab + content extraction', () => {
  it('calls getActiveTab() to obtain the current tab URL', async () => {
    await service.clip(defaultRequest);
    expect(tabAdapter.getActiveTab).toHaveBeenCalled();
  });

  it('calls hooks.beforeClip with extracted content — result may modify content', async () => {
    hooks.beforeClip.call.mockImplementation(async (content: unknown) => ({
      ...(content as object),
      title: 'Modified Title',
    }));
    await service.clip(defaultRequest);
    expect(hooks.beforeClip.call).toHaveBeenCalledWith(
      expect.objectContaining({ url: ARTICLE_URL }),
    );
  });
});

describe('ClipService — destination resolution', () => {
  it('resolves the destination via IDestinationStorage.getById()', async () => {
    await service.clip(defaultRequest);
    expect(destinationStorage.getById).toHaveBeenCalledWith('dest-1');
  });

  it('throws DestinationNotFoundError when destination does not exist', async () => {
    destinationStorage.getById.mockResolvedValue(undefined);
    await expect(service.clip(defaultRequest)).rejects.toBeInstanceOf(DestinationNotFoundError);
  });
});

describe('ClipService — save flow', () => {
  it('calls hooks.beforeSave — returning false aborts the save', async () => {
    hooks.beforeSave.call.mockResolvedValue(false);
    const result = await service.clip(defaultRequest);
    expect(mockSaveTo).not.toHaveBeenCalled();
    expect(result).toMatchObject({ aborted: true });
  });

  it('calls saveTo() with the resolved directory handle and content', async () => {
    await service.clip(defaultRequest);
    expect(mockSaveTo).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Inbox' }),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('fires hooks.afterSave on successful save', async () => {
    await service.clip(defaultRequest);
    expect(hooks.afterSave.call).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: expect.any(String) }),
    );
  });
});

describe('ClipService — filename sanitization', () => {
  it('sanitizes special chars (# and |) from the resolved fileName', async () => {
    tabAdapter.getActiveTab.mockResolvedValue({
      id: 1,
      url: ARTICLE_URL,
      title: 'Hello #world | piped [bracketed]',
    });
    await service.clip(defaultRequest);
    const fileNameArg = mockSaveTo.mock.calls[0]?.[1] as string;
    expect(fileNameArg).not.toMatch(/[#|^[\]]/);
  });
});

describe('ClipService — notifications + result', () => {
  it('shows a success notification via INotificationAdapter', async () => {
    await service.clip(defaultRequest);
    expect(notifications.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('returns a ClipResult with fileName and destination on success', async () => {
    const result = await service.clip(defaultRequest);
    expect(result).toMatchObject({
      fileName: expect.any(String),
      destination: expect.any(String),
    });
  });
});

describe('ClipService — html extraction via evaluateOnTab', () => {
  it('calls evaluateOnTab to extract page HTML', async () => {
    await service.clip(defaultRequest);
    expect(tabAdapter.evaluateOnTab).toHaveBeenCalledWith(1, expect.any(Function));
  });

  it('passes extracted html to beforeClip hook', async () => {
    tabAdapter.evaluateOnTab.mockResolvedValue('<article>content</article>');
    await service.clip(defaultRequest);
    expect(hooks.beforeClip.call).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<article>content</article>' }),
    );
  });

  it('succeeds with empty html when evaluateOnTab rejects (e.g. content script unavailable)', async () => {
    tabAdapter.evaluateOnTab.mockRejectedValue(
      new Error('Could not establish connection. Receiving end does not exist.'),
    );
    const result = await service.clip(defaultRequest);
    expect(result).toMatchObject({ fileName: expect.any(String), destination: expect.any(String) });
  });
});
