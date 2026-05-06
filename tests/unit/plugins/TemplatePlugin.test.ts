// tests/unit/plugins/TemplatePlugin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import { extractArticleMarkdown } from '@domain/extractor/content-extractor';
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

/** Shared URL fixture used by `beforeClip` test cases. */
const EXAMPLE_URL = 'https://example.com';

/** Shared `ClipContent` fixture used by `beforeClip` test cases. */
const baseContent: ClipContent = {
  title: 'Hello',
  url: EXAMPLE_URL,
  body: '<p>raw</p>',
  selectedText: '',
};

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface TemplateTestHarness {
  plugin: TemplatePlugin;
  ctx: IPluginContext;
  templateService: {
    getDefault: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
  };
}

/** Builds a fresh TemplatePlugin + mock context with a stubbed ITemplateService. */
function setupHarness(): TemplateTestHarness {
  const plugin = new TemplatePlugin();
  const ctx = createMockContext();

  const templateService = {
    getDefault: vi.fn().mockResolvedValue({
      id: 'default',
      name: 'Default',
      frontmatterTemplate: '',
      bodyTemplate: '# {{title}}',
      noteNameTemplate: '{{title}}',
    }),
    render: vi.fn().mockResolvedValue({ ok: true, output: '# Hello World', errors: [] }),
    getAll: vi.fn().mockResolvedValue([]),
  };

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    if (Object.is(token, TYPES.ITemplateService)) {
      return templateService;
    }
    return undefined;
  });

  return { plugin, ctx, templateService };
}

describe('TemplatePlugin — manifest', () => {
  let plugin: TemplatePlugin;

  beforeEach(() => {
    plugin = new TemplatePlugin();
  });

  it('has id "template"', () => {
    expect(plugin.manifest.id).toBe('template');
  });

  it('declares "clipper" as a dependency', () => {
    expect(plugin.manifest.dependencies).toContain('clipper');
  });

  it('has the correct name and version', () => {
    expect(plugin.manifest.name).toBe('Template');
    expect(plugin.manifest.version).toBe('1.0.0');
  });
});

describe('TemplatePlugin — activate() container resolution', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves ITemplateService from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.ITemplateService);
  });
});

describe('TemplatePlugin — activate() UI registration and logging', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers TemplateSelector in the popup-properties slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'popup-properties',
      expect.objectContaining({ component: 'TemplateSelector' }),
    );
  });

  it('registers TemplateSettingsPanel in the settings-section slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'settings-section',
      expect.objectContaining({ component: 'TemplateSettingsPanel' }),
    );
  });

  it('logs activation info', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.logger.info).toHaveBeenCalledWith('TemplatePlugin activated');
  });
});

describe('TemplatePlugin — activate() hook taps', () => {
  let harness: TemplateTestHarness;

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

  it('taps hooks.onTemplateRender with tapAsync', async () => {
    const onTemplateRenderSpy = vi.spyOn(harness.ctx.hooks.onTemplateRender, 'tapAsync');

    await harness.plugin.activate(harness.ctx);

    expect(onTemplateRenderSpy).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('TemplatePlugin — beforeClip service calls', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls templateService.getDefault() then render(template.id, explicit variables)', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call(baseContent);

    expect(harness.templateService.getDefault).toHaveBeenCalledTimes(1);
    expect(harness.templateService.render).toHaveBeenCalledWith('default', {
      content: expect.any(String),
      title: 'Hello',
      url: EXAMPLE_URL,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      selectedText: '',
    });
  });

  it('calls extractArticleMarkdown with the content body and URL when markdown is not pre-extracted', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call(baseContent);

    expect(extractArticleMarkdown).toHaveBeenCalledWith(baseContent.body, baseContent.url);
  });

  it('skips extractArticleMarkdown and uses content.markdown directly when pre-extracted', async () => {
    await harness.plugin.activate(harness.ctx);
    const contentWithMarkdown: ClipContent = {
      ...baseContent,
      markdown: 'pre-extracted article markdown',
    };
    await harness.ctx.hooks.beforeClip.call(contentWithMarkdown);

    expect(extractArticleMarkdown).not.toHaveBeenCalled();
    const renderArgs = harness.templateService.render.mock.calls[0];
    const variables = renderArgs?.[1] as { content: string };
    expect(variables.content).toBe('pre-extracted article markdown');
  });
});

describe('TemplatePlugin — beforeClip render() variables', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes Defuddle-extracted markdown as the `content` variable to render()', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call(baseContent);

    const renderArgs = harness.templateService.render.mock.calls[0];
    expect(renderArgs).toBeDefined();
    const variables = renderArgs?.[1] as { content: string };
    // extractArticleMarkdown converts `<p>raw</p>` to `raw` (paragraph wrapper stripped, trimmed).
    expect(variables.content).toBe('raw');
  });

  it("passes today's ISO date (YYYY-MM-DD) as the `date` variable to render()", async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.ctx.hooks.beforeClip.call(baseContent);

    const renderArgs = harness.templateService.render.mock.calls[0];
    const variables = renderArgs?.[1] as { date: string };
    const expected = new Date().toISOString().slice(0, 10);
    expect(variables.date).toBe(expected);
  });
});

describe('TemplatePlugin — beforeClip handler result mapping', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns content with body replaced by render output when result.ok is true', async () => {
    await harness.plugin.activate(harness.ctx);
    const result = await harness.ctx.hooks.beforeClip.call(baseContent);

    expect(result.body).toBe('# Hello World');
    expect(result.title).toBe(baseContent.title);
    expect(result.url).toBe(baseContent.url);
  });

  it('returns markdown body (not raw HTML) when result.ok is false', async () => {
    harness.templateService.render.mockResolvedValueOnce({
      ok: false,
      output: 'failed',
      errors: ['oops'],
    });

    await harness.plugin.activate(harness.ctx);
    const result = await harness.ctx.hooks.beforeClip.call(baseContent);

    // body must be the Turndown-converted markdown, never the raw HTML input
    expect(result.body).toBe('raw');
    expect(result.body).not.toBe(baseContent.body);
    expect(result.title).toBe(baseContent.title);
    expect(result.url).toBe(baseContent.url);
  });

  it('returns rendered template (not raw HTML) when extractArticleMarkdown throws', async () => {
    vi.mocked(extractArticleMarkdown).mockRejectedValueOnce(
      new Error('Maximum call stack size exceeded'),
    );

    await harness.plugin.activate(harness.ctx);
    const result = await harness.ctx.hooks.beforeClip.call(baseContent);

    // body must never be the raw HTML — render should still be called and succeed
    expect(result.body).not.toBe(baseContent.body);
    expect(result.body).not.toContain('<p>');
  });
});

describe('TemplatePlugin — onTemplateRender handler behavior', () => {
  let harness: TemplateTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes the rendered string through unchanged', async () => {
    await harness.plugin.activate(harness.ctx);
    const out = await harness.ctx.hooks.onTemplateRender.call('rendered output');

    expect(out).toBe('rendered output');
  });
});

describe('TemplatePlugin — deactivate()', () => {
  let harness: TemplateTestHarness;

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

  it('unsubscribes the beforeClip tap so subsequent calls do not invoke render', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.plugin.deactivate();

    harness.templateService.render.mockClear();
    await harness.ctx.hooks.beforeClip.call({
      title: 'After deactivate',
      url: 'https://example.com',
      body: 'body',
      selectedText: '',
    });

    expect(harness.templateService.render).not.toHaveBeenCalled();
  });
});
