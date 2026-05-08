// tests/unit/plugins/HighlighterPlugin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { ClipContent, IPluginContext } from '@domain/types';
import { HighlighterPlugin } from '@plugins/highlighter/HighlighterPlugin';

import { createMockContext } from '../../helpers/createMockContext';

const TEST_URL = 'https://example.com';

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface HighlighterTestHarness {
  plugin: HighlighterPlugin;
  ctx: IPluginContext;
  highlightService: {
    addHighlight: ReturnType<typeof vi.fn>;
    getHighlightsForUrl: ReturnType<typeof vi.fn>;
    removeHighlight: ReturnType<typeof vi.fn>;
    clearHighlightsForUrl: ReturnType<typeof vi.fn>;
  };
}

/** Builds a fresh HighlighterPlugin + mock context with stubbed services. */
function setupHarness(): HighlighterTestHarness {
  const plugin = new HighlighterPlugin();
  const ctx = createMockContext();

  const highlightService = {
    addHighlight: vi.fn().mockResolvedValue({
      id: 'hl_1',
      url: TEST_URL,
      text: 'sample',
      color: 'yellow',
      xpath: '/html/body/p[1]',
      createdAt: 0,
    }),
    getHighlightsForUrl: vi.fn().mockResolvedValue([]),
    removeHighlight: vi.fn().mockResolvedValue(undefined),
    clearHighlightsForUrl: vi.fn().mockResolvedValue(undefined),
  };

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    if (Object.is(token, TYPES.IHighlightService)) {
      return highlightService;
    }
    return undefined;
  });

  return { plugin, ctx, highlightService };
}

describe('HighlighterPlugin — manifest', () => {
  let plugin: HighlighterPlugin;

  beforeEach(() => {
    plugin = new HighlighterPlugin();
  });

  it('has id "highlighter"', () => {
    expect(plugin.manifest.id).toBe('highlighter');
  });

  it('declares "clipper" as a dependency', () => {
    expect(plugin.manifest.dependencies).toContain('clipper');
  });

  it('has the correct name and version', () => {
    expect(plugin.manifest.name).toBe('Highlighter');
    expect(plugin.manifest.version).toBe('1.0.0');
  });
});

describe('HighlighterPlugin — activate() container resolution', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves IHighlightService from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.IHighlightService);
  });

  it('logs activation info', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.logger.info).toHaveBeenCalledWith('HighlighterPlugin activated');
  });
});

describe('HighlighterPlugin — activate() hook taps', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('taps hooks.beforeClip with tapAsync', async () => {
    const beforeClipSpy = vi.spyOn(harness.ctx.hooks.beforeClip, 'tapAsync');

    await harness.plugin.activate(harness.ctx);

    expect(beforeClipSpy).toHaveBeenCalledWith(expect.any(Function));
  });
});

const BASE_CONTENT: ClipContent = {
  title: 'Hello',
  url: TEST_URL,
  body: '<p>raw</p>',
  selectedText: '',
};

describe('HighlighterPlugin — beforeClip handler resolution', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls highlightService.getHighlightsForUrl(content.url)', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call(BASE_CONTENT);

    expect(harness.highlightService.getHighlightsForUrl).toHaveBeenCalledWith(BASE_CONTENT.url);
  });

  it('returns content unchanged when there are no highlights for the URL', async () => {
    harness.highlightService.getHighlightsForUrl.mockResolvedValueOnce([]);

    await harness.plugin.activate(harness.ctx);
    const result = await harness.ctx.hooks.beforeClip.call(BASE_CONTENT);

    expect(result).toEqual(BASE_CONTENT);
  });
});

describe('HighlighterPlugin — beforeClip handler injection', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('injects highlight texts into content.highlights when highlights exist', async () => {
    harness.highlightService.getHighlightsForUrl.mockResolvedValueOnce([
      {
        id: 'hl_1',
        url: BASE_CONTENT.url,
        text: 'first highlight',
        color: 'yellow',
        xpath: '/html/body/p[1]',
        createdAt: 0,
      },
      {
        id: 'hl_2',
        url: BASE_CONTENT.url,
        text: 'second highlight',
        color: 'yellow',
        xpath: '/html/body/p[2]',
        createdAt: 1,
      },
    ]);

    await harness.plugin.activate(harness.ctx);
    const result = await harness.ctx.hooks.beforeClip.call(BASE_CONTENT);

    expect(result.highlights).toContain('first highlight');
    expect(result.highlights).toContain('second highlight');
    expect(result.title).toBe(BASE_CONTENT.title);
    expect(result.url).toBe(BASE_CONTENT.url);
    expect(result.body).toBe(BASE_CONTENT.body);
  });
});

describe('HighlighterPlugin — deactivate() resolution', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without error after activate()', async () => {
    await harness.plugin.activate(harness.ctx);
    await expect(harness.plugin.deactivate()).resolves.toBeUndefined();
  });

  it('resolves without error before activate()', async () => {
    await expect(harness.plugin.deactivate()).resolves.toBeUndefined();
  });
});

describe('HighlighterPlugin — deactivate() hook unsubscription', () => {
  let harness: HighlighterTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('unsubscribes the beforeClip tap so subsequent calls do not invoke getHighlightsForUrl', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.plugin.deactivate();

    harness.highlightService.getHighlightsForUrl.mockClear();
    await harness.ctx.hooks.beforeClip.call({
      title: 'After deactivate',
      url: TEST_URL,
      body: 'body',
      selectedText: '',
    });

    expect(harness.highlightService.getHighlightsForUrl).not.toHaveBeenCalled();
  });
});
