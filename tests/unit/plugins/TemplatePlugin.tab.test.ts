// tests/unit/plugins/TemplatePlugin.tab.test.ts
//
// Tab-adapter dependent tests for TemplatePlugin: meta tag variables,
// schema.org variables, and selector IPC calls. Kept separate from the core
// test suite so each file stays within the 400-line limit.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { ClipContent, IPluginContext } from '@domain/types';
import { TemplatePlugin } from '@plugins/template/TemplatePlugin';

import { createMockContext } from '../../helpers/createMockContext';

vi.mock('@domain/extractor/content-extractor', async (importActual) => {
  const actual = await importActual<typeof import('@domain/extractor/content-extractor')>();
  return {
    ...actual,
    extractArticleMarkdown: vi
      .fn()
      .mockImplementation((...args: Parameters<typeof actual.extractArticleMarkdown>) =>
        actual.extractArticleMarkdown(...args),
      ),
  };
});

/** Shared URL fixture used by test cases. */
const EXAMPLE_URL = 'https://example.com';

/** Default body template used in the template service mock. */
const BODY_TEMPLATE_DEFAULT = '# {{title}}';

/** Default note name template used in the template service mock. */
const NOTE_NAME_TEMPLATE = '{{title}}';

/** Shared `ClipContent` fixture used by test cases. */
const baseContent: ClipContent = {
  title: 'Hello',
  url: EXAMPLE_URL,
  body: '<p>raw</p>',
  selectedText: '',
};

/** Extended harness for selector IPC and metadata tests. */
interface TemplateTestHarnessWithTab {
  plugin: TemplatePlugin;
  ctx: IPluginContext;
  templateService: {
    getDefault: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };
  tabAdapter: { sendMessageToTab: ReturnType<typeof vi.fn> };
}

/**
 * Builds a fresh TemplatePlugin + mock context with both ITemplateService and
 * ITabAdapter stubs wired into the container.
 */
function setupHarnessWithTabAdapter(): TemplateTestHarnessWithTab {
  const plugin = new TemplatePlugin();
  const ctx = createMockContext();

  const templateService = {
    getDefault: vi.fn().mockResolvedValue({
      id: 'default',
      name: 'Default',
      frontmatterTemplate: '',
      bodyTemplate: BODY_TEMPLATE_DEFAULT,
      noteNameTemplate: NOTE_NAME_TEMPLATE,
    }),
    render: vi.fn().mockResolvedValue({ ok: true, output: '# Hello World', errors: [] }),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
  };

  const tabAdapter = { sendMessageToTab: vi.fn().mockResolvedValue({}) };

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    if (Object.is(token, TYPES.ITemplateService)) return templateService;
    if (Object.is(token, TYPES.ITabAdapter)) return tabAdapter;
    return undefined;
  });

  return { plugin, ctx, templateService, tabAdapter };
}

/** Builds a harness with the default template overridden to use a selector variable. */
function buildSelectorHarness(): TemplateTestHarnessWithTab {
  const h = setupHarnessWithTabAdapter();
  h.templateService.getDefault.mockResolvedValue({
    id: 'default',
    name: 'Default',
    frontmatterTemplate: '',
    bodyTemplate: '# {{selector:.title}}',
    noteNameTemplate: NOTE_NAME_TEMPLATE,
  });
  return h;
}

describe('TemplatePlugin — beforeClip meta tag variables', () => {
  let harness: TemplateTestHarnessWithTab;

  beforeEach(() => {
    harness = setupHarnessWithTabAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes meta:name:keywords variable when allMetaTags has a name entry', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({
      ...baseContent,
      allMetaTags: [{ name: 'keywords', content: 'vitest,typescript' }],
    });

    const variables = harness.templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(variables['meta:name:keywords']).toBe('vitest,typescript');
  });

  it('passes meta:property:og:image variable when allMetaTags has a property entry', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({
      ...baseContent,
      allMetaTags: [{ property: 'og:image', content: 'https://example.com/img.png' }],
    });

    const variables = harness.templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(variables['meta:property:og:image']).toBe('https://example.com/img.png');
  });

  it('skips meta tags with null content', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({
      ...baseContent,
      allMetaTags: [{ name: 'robots', content: null }],
    });

    const variables = harness.templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(variables).find((k) => k.startsWith('meta:name:robots'))).toBeUndefined();
  });
});

describe('TemplatePlugin — beforeClip schema.org variables', () => {
  let harness: TemplateTestHarnessWithTab;

  beforeEach(() => {
    harness = setupHarnessWithTabAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes schema:@Article:author variable when schemaOrgData has a typed object', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({
      ...baseContent,
      schemaOrgData: { '@type': 'Article', author: 'Jane Doe', headline: 'Hello World' },
    });

    const variables = harness.templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(variables['schema:@Article:author']).toBe('Jane Doe');
    expect(variables['schema:@Article:headline']).toBe('Hello World');
  });

  it('does not add schema variables when schemaOrgData is undefined', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({ ...baseContent });

    const variables = harness.templateService.render.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(variables).find((k) => k.startsWith('schema:'))).toBeUndefined();
  });
});

describe('TemplatePlugin — beforeClip selector IPC call', () => {
  let harness: TemplateTestHarnessWithTab;

  beforeEach(() => {
    harness = buildSelectorHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls sendMessageToTab with extractSelectors when tabId is set and template has selector variable', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({ ...baseContent, tabId: 42 });

    expect(harness.tabAdapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'extractSelectors',
      selectors: ['selector:.title'],
    });
  });

  it('does NOT call sendMessageToTab when tabId is absent', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call({ ...baseContent });

    expect(harness.tabAdapter.sendMessageToTab).not.toHaveBeenCalled();
  });

  it('clip completes when sendMessageToTab rejects (IPC error is non-fatal)', async () => {
    harness.tabAdapter.sendMessageToTab.mockRejectedValue(new Error('content script not ready'));

    await harness.plugin.activate(harness.ctx);
    await expect(
      harness.ctx.hooks.beforeClip.call({ ...baseContent, tabId: 42 }),
    ).resolves.not.toThrow();
    expect(harness.templateService.render).toHaveBeenCalledTimes(1);
  });

  it('clip completes when sendMessageToTab returns null (null response is non-fatal)', async () => {
    harness.tabAdapter.sendMessageToTab.mockResolvedValue(null);

    await harness.plugin.activate(harness.ctx);
    await expect(
      harness.ctx.hooks.beforeClip.call({ ...baseContent, tabId: 42 }),
    ).resolves.not.toThrow();
    expect(harness.templateService.render).toHaveBeenCalledTimes(1);
  });
});
