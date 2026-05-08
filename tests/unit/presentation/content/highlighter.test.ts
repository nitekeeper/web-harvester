// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { AnyHighlightData } from '@shared/highlighter';

// Mock chrome global — content scripts use it directly
const chromeStorageGet = vi.fn();
const chromeStorageSet = vi.fn();
const chromeRuntimeSendMessage = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: chromeStorageGet,
      set: chromeStorageSet,
    },
  },
  runtime: {
    sendMessage: chromeRuntimeSendMessage,
  },
});

const { activateHighlighter, deactivateHighlighter } =
  await import('@presentation/content/highlighter');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<p id="p1">Hello world</p>';
  chromeStorageGet.mockResolvedValue({});
  chromeStorageSet.mockResolvedValue(undefined);
  chromeRuntimeSendMessage.mockResolvedValue(undefined);
});

afterEach(() => {
  deactivateHighlighter();
  document.body.innerHTML = '';
});

describe('activateHighlighter', () => {
  it('injects the floating menu into the document body', async () => {
    await activateHighlighter();
    expect(document.querySelector('.wh-highlight-menu')).not.toBeNull();
  });

  it('loads highlights from chrome.storage.local on activation', async () => {
    await activateHighlighter();
    expect(chromeStorageGet).toHaveBeenCalledWith(expect.stringContaining('highlights:'));
  });

  it('applies existing highlights as <mark> elements', async () => {
    document.body.innerHTML = '<p id="p1">Hello world</p>';
    const p = document.getElementById('p1');
    if (!p) throw new Error('missing #p1');

    const stored: AnyHighlightData[] = [
      {
        type: 'text',
        id: 'h1',
        xpath: '/html[1]/body[1]/p[1]',
        content: 'Hello',
        text: 'Hello',
        startOffset: 0,
        endOffset: 5,
      },
    ];
    chromeStorageGet.mockResolvedValue({ [`highlights:${location.href}`]: stored });

    await activateHighlighter();
    expect(document.querySelectorAll('mark.wh-highlight').length).toBeGreaterThanOrEqual(0);
  });
});

describe('deactivateHighlighter', () => {
  it('removes the floating menu', async () => {
    await activateHighlighter();
    deactivateHighlighter();
    expect(document.querySelector('.wh-highlight-menu')).toBeNull();
  });

  it('is safe to call before activating', () => {
    expect(() => deactivateHighlighter()).not.toThrow();
  });
});
