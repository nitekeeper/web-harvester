// tests/unit/application/TemplateService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TemplateService, type ITemplateService } from '@application/TemplateService';
import { createLogger } from '@shared/logger';
import type { TemplateConfig } from '@shared/types';

// ── Storage mock ───────────────────────────────────────────────────────────────

function createMockTemplateStorage() {
  const store = new Map<string, TemplateConfig>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? undefined),
    getAll: vi.fn(async () => Array.from(store.values())),
    set: vi.fn(async (key: string, value: TemplateConfig) => {
      store.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
}

// ── compileTemplate mock ──────────────────────────────────────────────────────

const mockCompileTemplate = vi.fn().mockReturnValue({
  ok: true,
  output: '# Compiled Note',
  errors: [],
});

// ── hooks mock ────────────────────────────────────────────────────────────────

function createMockHooks() {
  return {
    onTemplateRender: {
      tap: vi.fn(),
      call: vi.fn().mockImplementation(async (v: unknown) => v),
    },
  };
}

// ── Variables fixture ─────────────────────────────────────────────────────────

const testVariables = {
  title: 'My Article',
  url: 'https://example.com',
  date: '2024-01-01',
  content: '<p>Hello world</p>',
};

const TMPL_ID = 'tmpl';
const CONTENT_PLACEHOLDER = '{{content}}';

// ── Test setup ────────────────────────────────────────────────────────────────

let storage: ReturnType<typeof createMockTemplateStorage>;
let hooks: ReturnType<typeof createMockHooks>;
let service: ITemplateService;

beforeEach(() => {
  vi.clearAllMocks();
  storage = createMockTemplateStorage();
  hooks = createMockHooks();
  service = new TemplateService(storage, hooks, mockCompileTemplate, createLogger('test'));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TemplateService — getDefault()', () => {
  it('returns the built-in default template when no templates are stored', async () => {
    storage.getAll.mockResolvedValue([]);
    const template = await service.getDefault();
    expect(template.id).toBe('default');
    expect(template.name).toBe('Default');
    expect(template.frontmatterTemplate).toContain('title:');
    expect(template.bodyTemplate).toContain(CONTENT_PLACEHOLDER);
    expect(template.noteNameTemplate).toContain('{{title');
  });

  it('returns the first stored template as default when templates exist', async () => {
    const custom: TemplateConfig = {
      id: 'my-template',
      name: 'My Template',
      frontmatterTemplate: '---\ntitle: {{title}}\n---',
      bodyTemplate: CONTENT_PLACEHOLDER,
      noteNameTemplate: '{{title}}',
    };
    storage.getAll.mockResolvedValue([custom]);
    const template = await service.getDefault();
    expect(template.id).toBe('my-template');
  });
});

describe('TemplateService — getAll()', () => {
  it('returns all stored templates', async () => {
    const t1: TemplateConfig = {
      id: 't1',
      name: 'T1',
      frontmatterTemplate: '',
      bodyTemplate: '',
      noteNameTemplate: '',
    };
    storage.getAll.mockResolvedValue([t1]);
    const all = await service.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe('t1');
  });
});

describe('TemplateService — getById()', () => {
  it('returns a template by id', async () => {
    const t: TemplateConfig = {
      id: 'abc',
      name: 'ABC',
      frontmatterTemplate: '',
      bodyTemplate: '',
      noteNameTemplate: '',
    };
    storage.get.mockResolvedValue(t);
    const result = await service.getById('abc');
    expect(result).toEqual(t);
  });

  it('returns undefined when template does not exist', async () => {
    storage.get.mockResolvedValue(undefined);
    const result = await service.getById('missing');
    expect(result).toBeUndefined();
  });
});

describe('TemplateService — save()', () => {
  it('persists the template to storage', async () => {
    const t: TemplateConfig = {
      id: 'new',
      name: 'New',
      frontmatterTemplate: '---\n---',
      bodyTemplate: CONTENT_PLACEHOLDER,
      noteNameTemplate: '{{title}}',
    };
    await service.save(t);
    expect(storage.set).toHaveBeenCalledWith('new', t);
  });
});

describe('TemplateService — remove()', () => {
  it('removes a template from storage', async () => {
    await service.remove('some-id');
    expect(storage.remove).toHaveBeenCalledWith('some-id');
  });
});

describe('TemplateService — render() — happy path', () => {
  it('calls compileTemplate() with the template body and variables', async () => {
    const t: TemplateConfig = {
      id: TMPL_ID,
      name: 'T',
      frontmatterTemplate: '---\ntitle: {{title}}\n---',
      bodyTemplate: CONTENT_PLACEHOLDER,
      noteNameTemplate: '{{date}} {{title}}',
    };
    storage.get.mockResolvedValue(t);
    await service.render(TMPL_ID, testVariables);
    expect(mockCompileTemplate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: testVariables.title }),
    );
  });

  it('fires hooks.onTemplateRender — can modify the rendered body', async () => {
    const t: TemplateConfig = {
      id: TMPL_ID,
      name: 'T',
      frontmatterTemplate: '',
      bodyTemplate: CONTENT_PLACEHOLDER,
      noteNameTemplate: '{{title}}',
    };
    storage.get.mockResolvedValue(t);
    hooks.onTemplateRender.call.mockResolvedValue('# Hook Modified Body');
    const result = await service.render(TMPL_ID, testVariables);
    expect(hooks.onTemplateRender.call).toHaveBeenCalled();
    expect(result.output).toBe('# Hook Modified Body');
  });

  it('renders built-in default when its id is not in storage', async () => {
    storage.get.mockResolvedValue(undefined);
    const result = await service.render('default', testVariables);
    expect(result.ok).toBe(true);
    expect(mockCompileTemplate).toHaveBeenCalledWith(
      expect.stringContaining(CONTENT_PLACEHOLDER),
      expect.objectContaining({ title: testVariables.title }),
    );
  });
});

describe('TemplateService — render() — error cases', () => {
  it('throws when template id does not exist', async () => {
    storage.get.mockResolvedValue(undefined);
    await expect(service.render('ghost', testVariables)).rejects.toThrow(/not found/i);
  });
});
