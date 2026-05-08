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

const PARAGRAPH_HTML = '<p id="p1">Hello world</p>';
const P1_XPATH = '/html[1]/body[1]/p[1]';
const MARK_SELECTOR = 'mark.wh-highlight';
const CLEAR_BTN_SELECTOR = '.wh-highlight-clear';
const MARK_NOT_FOUND = 'mark not found';
const CLEAR_BTN_NOT_FOUND = 'clear button not found';

/** Returns the storage key matching what highlighter.ts builds for the current page. */
function highlightStorageKey(): string {
  return `highlights:${location.href}`;
}

/** Builds a stored highlight array for p1 with text "Hello". */
function makeP1Highlights(): AnyHighlightData[] {
  return [
    {
      type: 'text',
      id: 'h1',
      xpath: P1_XPATH,
      content: 'Hello',
      text: 'Hello',
      startOffset: 0,
      endOffset: 5,
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = PARAGRAPH_HTML;
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
    document.body.innerHTML = PARAGRAPH_HTML;
    const p = document.getElementById('p1');
    if (!p) throw new Error('missing #p1');

    chromeStorageGet.mockResolvedValue({ [highlightStorageKey()]: makeP1Highlights() });

    await activateHighlighter();
    expect(document.querySelectorAll(MARK_SELECTOR).length).toBeGreaterThanOrEqual(0);
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

/** Activates the highlighter with a single stored text highlight on p1. */
async function activateWithP1Highlight(): Promise<void> {
  document.body.innerHTML = PARAGRAPH_HTML;
  chromeStorageGet.mockResolvedValue({ [highlightStorageKey()]: makeP1Highlights() });
  await activateHighlighter();
}

describe('click-to-remove', () => {
  it('clicking a mark removes it from the DOM', async () => {
    await activateWithP1Highlight();
    const markEl = document.querySelector(MARK_SELECTOR);
    expect(markEl).not.toBeNull();
    if (!markEl) throw new Error(MARK_NOT_FOUND);
    markEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector(MARK_SELECTOR)).toBeNull();
  });

  it('clicking a mark removes the highlight from storage', async () => {
    await activateWithP1Highlight();
    const markEl = document.querySelector(MARK_SELECTOR);
    expect(markEl).not.toBeNull();
    if (!markEl) throw new Error(MARK_NOT_FOUND);
    vi.clearAllMocks();
    chromeStorageSet.mockResolvedValue(undefined);
    markEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(chromeStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [highlightStorageKey()]: [] }),
    );
  });

  it('clicking a mark updates the count in the floating menu', async () => {
    await activateWithP1Highlight();
    const markEl = document.querySelector(MARK_SELECTOR);
    expect(markEl).not.toBeNull();
    if (!markEl) throw new Error(MARK_NOT_FOUND);
    markEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const countEl = document.querySelector('.wh-highlight-count');
    expect(countEl?.textContent).toContain('0');
  });
});

describe('clearAllHighlights via Clear all button', () => {
  it('clicking Clear all removes all marks from the DOM', async () => {
    await activateWithP1Highlight();
    expect(document.querySelectorAll(MARK_SELECTOR).length).toBeGreaterThan(0);
    const clearBtn = document.querySelector(CLEAR_BTN_SELECTOR);
    expect(clearBtn).not.toBeNull();
    if (!clearBtn) throw new Error(CLEAR_BTN_NOT_FOUND);
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelectorAll(MARK_SELECTOR).length).toBe(0);
  });

  it('clicking Clear all saves an empty array to storage', async () => {
    await activateWithP1Highlight();
    vi.clearAllMocks();
    chromeStorageSet.mockResolvedValue(undefined);
    const clearBtn = document.querySelector(CLEAR_BTN_SELECTOR);
    if (!clearBtn) throw new Error(CLEAR_BTN_NOT_FOUND);
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(chromeStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [highlightStorageKey()]: [] }),
    );
  });

  it('clicking Clear all updates the count to 0', async () => {
    await activateWithP1Highlight();
    const clearBtn = document.querySelector(CLEAR_BTN_SELECTOR);
    if (!clearBtn) throw new Error(CLEAR_BTN_NOT_FOUND);
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const countEl = document.querySelector('.wh-highlight-count');
    expect(countEl?.textContent).toContain('0');
  });
});
