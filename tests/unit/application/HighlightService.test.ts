// tests/unit/application/HighlightService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  HighlightService,
  type IHighlightService,
  type Highlight,
} from '@application/HighlightService';
import type { AnyHighlightData } from '@shared/highlighter';
import { createLogger } from '@shared/logger';

const TEST_URL = 'https://example.com/article';
const HIGHLIGHTS_KEY = `highlights:${TEST_URL}`;
const XPATH_P1 = '/html/body/p[1]';

// ── Storage adapter mock ──────────────────────────────────────────────────────

function createMockStorageAdapter() {
  const store = new Map<string, unknown>();
  return {
    getLocal: vi.fn(async (key: string) => store.get(key) ?? undefined),
    setLocal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    removeLocal: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    getSync: vi.fn(),
    setSync: vi.fn(),
    removeSync: vi.fn(),
    onChanged: vi.fn(),
    _store: store,
  };
}

// ── hooks mock ────────────────────────────────────────────────────────────────

function createMockHooks() {
  return {
    onHighlight: {
      tap: vi.fn(),
      call: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ── Shared per-test fixtures ──────────────────────────────────────────────────

let storage: ReturnType<typeof createMockStorageAdapter>;
let hooks: ReturnType<typeof createMockHooks>;
let service: IHighlightService;

beforeEach(() => {
  vi.clearAllMocks();
  storage = createMockStorageAdapter();
  hooks = createMockHooks();
  service = new HighlightService(storage, hooks, createLogger('test'));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HighlightService — addHighlight() shape', () => {
  it('creates a highlight and returns it with a generated id', async () => {
    const highlight = await service.addHighlight(TEST_URL, 'Important text', XPATH_P1, 'yellow');
    expect(highlight.id).toBeTruthy();
    expect(highlight.url).toBe(TEST_URL);
    expect(highlight.text).toBe('Important text');
    expect(highlight.xpath).toBe(XPATH_P1);
    expect(highlight.color).toBe('yellow');
    expect(typeof highlight.createdAt).toBe('number');
  });

  it('uses "yellow" as the default color when none is provided', async () => {
    const highlight = await service.addHighlight(TEST_URL, 'Some text', '/html/body/p[2]');
    expect(highlight.color).toBe('yellow');
  });
});

describe('HighlightService — addHighlight() side-effects', () => {
  it('persists the highlight under key "highlights:{normalizedUrl}"', async () => {
    await service.addHighlight(TEST_URL, 'Text', XPATH_P1);
    expect(storage.setLocal).toHaveBeenCalledWith(
      `highlights:${TEST_URL}`,
      expect.arrayContaining([expect.objectContaining({ text: 'Text' })]),
    );
  });

  it('does NOT fire hooks.onHighlight (content script owns persistence)', async () => {
    await service.addHighlight(TEST_URL, 'Text', XPATH_P1);
    expect(hooks.onHighlight.call).not.toHaveBeenCalled();
  });

  it('appends to existing highlights for the same URL', async () => {
    const firstHighlight: Highlight = {
      id: 'h1',
      url: TEST_URL,
      text: 'First',
      color: 'yellow',
      xpath: '/p[1]',
      createdAt: 1000,
    };
    storage.getLocal.mockResolvedValue([firstHighlight]);
    await service.addHighlight(TEST_URL, 'Second', '/p[2]');
    const lastCall = storage.setLocal.mock.calls.at(-1);
    expect(lastCall?.[1]).toHaveLength(2);
  });
});

function makeTextHighlight(id: string, xpath: string, text: string): AnyHighlightData {
  return {
    type: 'text',
    id,
    xpath,
    content: `<p>${text}</p>`,
    text,
    startOffset: 0,
    endOffset: text.length,
  };
}

describe('HighlightService — getHighlightsForUrl()', () => {
  it('maps AnyHighlightData[] from storage to Highlight[] using text field', async () => {
    storage.getLocal.mockResolvedValue([
      makeTextHighlight('h1', '/p[1]', 'A'),
      makeTextHighlight('h2', '/p[2]', 'B'),
    ]);
    const results = await service.getHighlightsForUrl(TEST_URL);
    expect(results).toHaveLength(2);
    expect(results[0]?.text).toBe('A');
    expect(results[1]?.text).toBe('B');
  });

  it('falls back to content field when text is absent', async () => {
    const noText: AnyHighlightData = {
      type: 'text',
      id: 'h1',
      xpath: '/p[1]',
      content: 'fallback text',
      startOffset: 0,
      endOffset: 8,
    };
    storage.getLocal.mockResolvedValue([noText]);
    const results = await service.getHighlightsForUrl(TEST_URL);
    expect(results[0]?.text).toBe('fallback text');
  });

  it('returns an empty array when no highlights exist for the URL', async () => {
    storage.getLocal.mockResolvedValue(undefined);
    const results = await service.getHighlightsForUrl(TEST_URL);
    expect(results).toEqual([]);
  });
});

describe('HighlightService — removeHighlight()', () => {
  it('removes a highlight by id and persists the remaining highlights', async () => {
    const existing: Highlight[] = [
      {
        id: 'h1',
        url: TEST_URL,
        text: 'Keep',
        color: 'yellow',
        xpath: '/p[1]',
        createdAt: 1000,
      },
      {
        id: 'h2',
        url: TEST_URL,
        text: 'Remove',
        color: 'blue',
        xpath: '/p[2]',
        createdAt: 2000,
      },
    ];
    storage.getLocal.mockImplementation(async (key: string) => {
      if (key === HIGHLIGHTS_KEY) return existing;
      if (key === 'highlight_index') return [TEST_URL];
      return undefined;
    });
    await service.removeHighlight('h2');
    const lastSet = storage.setLocal.mock.calls.find((c) => c[0] === HIGHLIGHTS_KEY);
    expect(lastSet?.[1]).toHaveLength(1);
    const remaining = lastSet?.[1] as Highlight[];
    expect(remaining[0]?.id).toBe('h1');
  });
});

describe('HighlightService — clearHighlightsForUrl()', () => {
  it('removes all highlights for a URL from storage', async () => {
    await service.clearHighlightsForUrl(TEST_URL);
    expect(storage.removeLocal).toHaveBeenCalledWith(HIGHLIGHTS_KEY);
  });
});
