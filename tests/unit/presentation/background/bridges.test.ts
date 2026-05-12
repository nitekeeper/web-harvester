// tests/unit/presentation/background/bridges.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { CoreHookSystem } from '@core/hooks';
import type { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import {
  buildClipHooksPort,
  buildTemplateService,
  compileTemplateForService,
} from '@presentation/background/bridges';
import type { TemplateConfig } from '@shared/types';

/** Creates a minimal CoreHookSystem mock with a custom beforeClip call handler. */
function createMockCoreHooks(beforeClipCall: (v: unknown) => Promise<unknown>): CoreHookSystem {
  return {
    beforeClip: {
      tapAsync: vi.fn(),
      tap: vi.fn(),
      call: vi.fn(beforeClipCall),
    },
    afterClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    beforeSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn(async (v: unknown) => v) },
    afterSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onHighlight: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onTemplateRender: {
      tap: vi.fn(),
      tapAsync: vi.fn(),
      call: vi.fn(async (v: unknown) => v as string),
    },
  } as unknown as CoreHookSystem;
}

describe('compileTemplateForService — frontmatter delimiters', () => {
  it('wraps non-empty frontmatter with `---` fences and separates from body with a blank line', async () => {
    const template = '---\ntitle: {{title}}\n---\nBody {{title}}';
    const result = await compileTemplateForService(template, { title: 'Hello' });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('---\ntitle: Hello\n---\n\nBody Hello');
  });

  it('starts the output with `---` so Obsidian recognises the YAML block', async () => {
    const template = '---\nkey: value\n---\nBody';
    const result = await compileTemplateForService(template, {});

    expect(result.output.startsWith('---\n')).toBe(true);
  });

  it('returns body alone (no `---` fences) when the template has no frontmatter', async () => {
    const template = 'Just a body, no fences.';
    const result = await compileTemplateForService(template, {});

    expect(result.ok).toBe(true);
    expect(result.output).toBe('Just a body, no fences.');
    expect(result.output.startsWith('---')).toBe(false);
  });

  it('coerces non-string variables to strings before rendering', async () => {
    const template = '{{count}}';
    const result = await compileTemplateForService(template, { count: 42 });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('42');
  });
});

const BRIDGE_METADATA = {
  description: 'A test description',
  author: 'Jane Doe',
  published: '2026-01-15',
  tags: 'web, tech',
  image: 'https://example.com/img.jpg',
  site: 'Example Blog',
  wordCount: 500,
};

describe('buildClipHooksPort — template id', () => {
  it('forwards selectedTemplateId from app-layer ClipContent to the domain hook', async () => {
    let capturedId: string | undefined;
    const mockHooks = createMockCoreHooks(async (v: unknown) => {
      capturedId = (v as { selectedTemplateId?: string }).selectedTemplateId;
      return { ...(v as object), body: 'transformed' };
    });

    const port = buildClipHooksPort(mockHooks);
    await port.beforeClip.call({
      url: 'https://example.com',
      html: '<p>hello</p>',
      title: 'Test',
      selectedTemplateId: 'my-template-id',
    });

    expect(capturedId).toBe('my-template-id');
  });
});

describe('buildClipHooksPort — metadata', () => {
  it('forwards page metadata fields to the domain beforeClip hook', async () => {
    let captured: Record<string, unknown> = {};
    const mockHooks = createMockCoreHooks(async (v: unknown) => {
      captured = v as Record<string, unknown>;
      return { ...(v as object), body: 'transformed' };
    });

    const port = buildClipHooksPort(mockHooks);
    await port.beforeClip.call({
      url: 'https://example.com',
      html: '<p>hello</p>',
      title: 'Test',
      ...BRIDGE_METADATA,
    });

    expect(captured).toMatchObject(BRIDGE_METADATA);
  });
});

// ── buildTemplateService — reads from settings-state ─────────────────────────

/** Minimal hook stub for TemplateService (only onTemplateRender is needed). */
function makeMinimalHooks(): CoreHookSystem {
  return {
    beforeClip: { tapAsync: vi.fn(), tap: vi.fn(), call: vi.fn() },
    afterClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    beforeSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn(async (v: unknown) => v) },
    afterSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onHighlight: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
    onTemplateRender: {
      tap: vi.fn(),
      tapAsync: vi.fn(),
      call: vi.fn(async (v: unknown) => v as string),
    },
  } as unknown as CoreHookSystem;
}

/** Builds a mock adapter whose getLocal returns the supplied settings-state value. */
function makeSettingsAdapter(templates: TemplateConfig[]): ChromeAdapter {
  return {
    getLocal: vi.fn().mockImplementation((key: string) => {
      if (key === 'settings-state') return Promise.resolve({ templates });
      return Promise.resolve(undefined);
    }),
    setLocal: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChromeAdapter;
}

const SAMPLE_TEMPLATE: TemplateConfig = {
  id: 'default',
  name: 'Obsidian Style',
  frontmatterTemplate: 'title: {{title}}\nnewkey: custom',
  bodyTemplate: '{{content}}',
  noteNameTemplate: '{{date}}-{{title}}',
};

describe('buildTemplateService — reads templates from settings-state', () => {
  it('getAll() returns templates array from settings-state', async () => {
    const adapter = makeSettingsAdapter([SAMPLE_TEMPLATE]);
    const service = buildTemplateService(adapter, makeMinimalHooks());

    const result = await service.getAll();

    expect(result).toEqual([SAMPLE_TEMPLATE]);
  });

  it('getById() returns template with matching id including any edited frontmatter', async () => {
    const adapter = makeSettingsAdapter([SAMPLE_TEMPLATE]);
    const service = buildTemplateService(adapter, makeMinimalHooks());

    const result = await service.getById('default');

    expect(result?.frontmatterTemplate).toBe('title: {{title}}\nnewkey: custom');
  });

  it('getById() returns undefined when id is not in settings-state templates', async () => {
    const adapter = makeSettingsAdapter([SAMPLE_TEMPLATE]);
    const service = buildTemplateService(adapter, makeMinimalHooks());

    const result = await service.getById('nonexistent');

    expect(result).toBeUndefined();
  });

  it('getAll() returns [] when settings-state has no templates array', async () => {
    const adapter = {
      getLocal: vi.fn().mockResolvedValue({ settings: {} }),
      setLocal: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChromeAdapter;
    const service = buildTemplateService(adapter, makeMinimalHooks());

    const result = await service.getAll();

    expect(result).toEqual([]);
  });

  it('reads from settings-state key, not the legacy templates key', async () => {
    const getLocal = vi.fn().mockResolvedValue(undefined);
    const adapter = { getLocal, setLocal: vi.fn() } as unknown as ChromeAdapter;
    const service = buildTemplateService(adapter, makeMinimalHooks());

    await service.getAll();

    expect(getLocal).toHaveBeenCalledWith('settings-state');
    expect(getLocal).not.toHaveBeenCalledWith('templates');
  });
});
