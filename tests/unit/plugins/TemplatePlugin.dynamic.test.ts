// tests/unit/plugins/TemplatePlugin.dynamic.test.ts
//
// Covers: meta tag variables, schema.org variables, and selector IPC paths.
// Kept in a separate file to stay within the 400-line max.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { ClipContent, IPluginContext } from '@domain/types';
import { TemplatePlugin } from '@plugins/template/TemplatePlugin';

import { createMockContext } from '../../helpers/createMockContext';

vi.mock('@domain/extractor/content-extractor', async (importActual) => {
  const actual = await importActual<typeof import('@domain/extractor/content-extractor')>();
  return { ...actual };
});

/** Shared URL fixture for dynamic variable test cases. */
const DYN_URL = 'https://example.com';

/** Minimal ClipContent fixture with markdown pre-set to skip Defuddle. */
const dynBase: ClipContent = {
  title: 'Dynamic Test',
  url: DYN_URL,
  body: '<p>body</p>',
  selectedText: '',
  markdown: 'body',
};

/** Default template fixture — uses unique strings to avoid sonarjs/no-duplicate-string. */
const DEFAULT_TEMPLATE_STUB = {
  id: 'dyn-default',
  name: 'Dynamic Default',
  frontmatterTemplate: '',
  bodyTemplate: '{{title}}',
  noteNameTemplate: '{{title}}',
};

/** Rendered output fixture — unique string to avoid sonarjs/no-duplicate-string. */
const RENDER_OUTPUT_STUB = 'rendered dynamic output';

/** Tab adapter mock type. */
interface TabAdapterMock {
  sendMessageToTab: ReturnType<typeof vi.fn>;
}

/** Template service mock type. */
interface TemplateServiceMock {
  getDefault: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
}

/** Builds a fresh template service mock. */
function makeTemplateService(): TemplateServiceMock {
  return {
    getDefault: vi.fn().mockResolvedValue(DEFAULT_TEMPLATE_STUB),
    render: vi.fn().mockResolvedValue({ ok: true, output: RENDER_OUTPUT_STUB, errors: [] }),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
  };
}

/** Builds a fresh tab adapter mock that resolves to an empty object. */
function makeTabAdapter(): TabAdapterMock {
  return { sendMessageToTab: vi.fn().mockResolvedValue({}) };
}

/** Wires template service and tab adapter into a mock container. */
function wireContainer(
  ctx: IPluginContext,
  templateService: TemplateServiceMock,
  tabAdapter: TabAdapterMock,
): void {
  vi.mocked(ctx.container.get).mockImplementation((token) => {
    if (Object.is(token, TYPES.ITemplateService)) return templateService;
    if (Object.is(token, TYPES.ITabAdapter)) return tabAdapter;
    return undefined;
  });
}

/** Shared test state for each describe block. */
let plugin: TemplatePlugin;
let ctx: IPluginContext;
let templateService: TemplateServiceMock;
let tabAdapter: TabAdapterMock;

/** Resets shared test state before each test. */
function resetHarness(): void {
  plugin = new TemplatePlugin();
  ctx = createMockContext();
  templateService = makeTemplateService();
  tabAdapter = makeTabAdapter();
  wireContainer(ctx, templateService, tabAdapter);
}

describe('TemplatePlugin — meta tag name variables', () => {
  beforeEach(resetHarness);
  afterEach(() => vi.clearAllMocks());

  it('resolves meta:name:keywords from allMetaTags name entry', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({
      ...dynBase,
      allMetaTags: [{ name: 'keywords', content: 'vitest,typescript' }],
    });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(vars['meta:name:keywords']).toBe('vitest,typescript');
  });

  it('skips meta tags with null content', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({
      ...dynBase,
      allMetaTags: [{ name: 'robots', content: null }],
    });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(vars).find((k) => k.startsWith('meta:name:robots'))).toBeUndefined();
  });
});

describe('TemplatePlugin — meta tag property variables', () => {
  beforeEach(resetHarness);
  afterEach(() => vi.clearAllMocks());

  it('resolves meta:property:og:image from allMetaTags property entry', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({
      ...dynBase,
      allMetaTags: [{ property: 'og:image', content: 'https://example.com/img.png' }],
    });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(vars['meta:property:og:image']).toBe('https://example.com/img.png');
  });

  it('does not call sendMessageToTab when no tabId is present', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call(dynBase);
    expect(tabAdapter.sendMessageToTab).not.toHaveBeenCalled();
  });
});

describe('TemplatePlugin — schema.org variables', () => {
  beforeEach(resetHarness);
  afterEach(() => vi.clearAllMocks());

  it('resolves schema:@Article:author from schemaOrgData', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({
      ...dynBase,
      schemaOrgData: { '@type': 'Article', author: 'Jane Doe', headline: 'Hello World' },
    });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(vars['schema:@Article:author']).toBe('Jane Doe');
    expect(vars['schema:@Article:headline']).toBe('Hello World');
  });

  it('does not add schema: variables when schemaOrgData is undefined', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({ ...dynBase });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(vars).find((k) => k.startsWith('schema:'))).toBeUndefined();
  });
});

/** Selector template stub used by IPC test groups. */
const SELECTOR_TEMPLATE_STUB = {
  id: 'dyn-sel',
  name: 'Selector Template',
  frontmatterTemplate: '',
  bodyTemplate: '{{selector:.title}}',
  noteNameTemplate: '{{title}}',
};

describe('TemplatePlugin — selector IPC dispatch', () => {
  beforeEach(() => {
    resetHarness();
    templateService.getDefault.mockResolvedValue(SELECTOR_TEMPLATE_STUB);
  });
  afterEach(() => vi.clearAllMocks());

  it('calls sendMessageToTab with extractSelectors when tabId is set', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({ ...dynBase, tabId: 42 });
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'extractSelectors',
      selectors: ['selector:.title'],
    });
  });

  it('does NOT call sendMessageToTab when tabId is absent', async () => {
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({ ...dynBase });
    expect(tabAdapter.sendMessageToTab).not.toHaveBeenCalled();
  });

  it('merges resolved selector values into template variables', async () => {
    tabAdapter.sendMessageToTab.mockResolvedValue({ 'selector:.title': 'Page Heading' });
    await plugin.activate(ctx);
    await ctx.hooks.beforeClip.call({ ...dynBase, tabId: 42 });
    const vars = templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(vars['selector:.title']).toBe('Page Heading');
  });
});

describe('TemplatePlugin — selector IPC resilience', () => {
  beforeEach(() => {
    resetHarness();
    templateService.getDefault.mockResolvedValue(SELECTOR_TEMPLATE_STUB);
  });
  afterEach(() => vi.clearAllMocks());

  it('clip completes when sendMessageToTab rejects (IPC error is non-fatal)', async () => {
    tabAdapter.sendMessageToTab.mockRejectedValue(new Error('content script not ready'));
    await plugin.activate(ctx);
    await expect(ctx.hooks.beforeClip.call({ ...dynBase, tabId: 42 })).resolves.not.toThrow();
    expect(templateService.render).toHaveBeenCalledTimes(1);
  });

  it('clip completes when sendMessageToTab returns null', async () => {
    tabAdapter.sendMessageToTab.mockResolvedValue(null);
    await plugin.activate(ctx);
    await expect(ctx.hooks.beforeClip.call({ ...dynBase, tabId: 42 })).resolves.not.toThrow();
    expect(templateService.render).toHaveBeenCalledTimes(1);
  });

  it('clip completes when sendMessageToTab returns a non-object primitive', async () => {
    tabAdapter.sendMessageToTab.mockResolvedValue('unexpected string');
    await plugin.activate(ctx);
    await expect(ctx.hooks.beforeClip.call({ ...dynBase, tabId: 42 })).resolves.not.toThrow();
    expect(templateService.render).toHaveBeenCalledTimes(1);
  });
});
