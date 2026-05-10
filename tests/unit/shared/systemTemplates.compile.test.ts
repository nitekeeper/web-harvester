// tests/unit/shared/systemTemplates.compile.test.ts
//
// Integration tests that compile each system template with the real compiler
// and the variable bag TemplatePlugin will supply. Guards against syntax errors
// in system template strings that silently make the compilation fail (ok:false)
// and cause the popup to show "Properties will appear after clipping" instead
// of the rendered frontmatter fields.

import { describe, it, expect } from 'vitest';

import { TemplateService } from '@application/TemplateService';
import { compileTemplateForService } from '@presentation/background/bridges';
import { parseFrontmatterFields } from '@presentation/popup/lib/parseFrontmatter';

const SYS_DEFAULT_ID = 'sys-default-article';
const SYS_QUICK_ID = 'sys-quick-capture';
const SYS_REFERENCE_ID = 'sys-reference-citation';
const TEST_TITLE = 'Test Page Title';
const TEST_URL = 'https://example.com/test-article';

/** Minimal in-memory storage that returns nothing from user storage. */
const emptyStorage = {
  get: async () => undefined,
  getAll: async () => [],
  set: async () => undefined,
  remove: async () => undefined,
};

/** No-op hook that passes the rendered string through unchanged. */
const passthroughHooks = {
  onTemplateRender: { call: async (v: string) => v },
};

/**
 * The variable bag that TemplatePlugin supplies to render() after the fix.
 * Uses flat dot-keyed entries so resolveVariable() finds `page.title` via its
 * plain-key lookup before falling back to getNestedValue.
 */
const PLUGIN_VARIABLES = {
  content: 'Article body content',
  title: TEST_TITLE,
  url: TEST_URL,
  date: '2026-05-09',
  selectedText: '',
  now: '2026-05-09',
  'page.title': TEST_TITLE,
  'page.url': TEST_URL,
  'page.domain': 'example.com',
};

function makeService() {
  return new TemplateService(emptyStorage, passthroughHooks, compileTemplateForService);
}

describe('system templates — compile without errors', () => {
  it('sys-default-article compiles with ok:true', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sys-quick-capture compiles with ok:true', async () => {
    const result = await makeService().render(SYS_QUICK_ID, PLUGIN_VARIABLES);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sys-reference-citation compiles with ok:true', async () => {
    const result = await makeService().render(SYS_REFERENCE_ID, PLUGIN_VARIABLES);
    expect(result.ok).toBe(true);
  });
});

describe('system templates — output has parseable frontmatter', () => {
  it('sys-default-article output has frontmatter fields', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    expect(parseFrontmatterFields(result.output).length).toBeGreaterThan(0);
  });

  it('sys-quick-capture output has frontmatter fields', async () => {
    const result = await makeService().render(SYS_QUICK_ID, PLUGIN_VARIABLES);
    expect(parseFrontmatterFields(result.output).length).toBeGreaterThan(0);
  });
});

describe('system templates — page variables resolve', () => {
  it('sys-default-article renders page.title into the title field', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    const titleField = parseFrontmatterFields(result.output).find((f) => f.key === 'title');
    expect(titleField?.value).toBe(TEST_TITLE);
  });

  it('sys-quick-capture renders page.title into the title field', async () => {
    const result = await makeService().render(SYS_QUICK_ID, PLUGIN_VARIABLES);
    const titleField = parseFrontmatterFields(result.output).find((f) => f.key === 'title');
    expect(titleField?.value).toBe(TEST_TITLE);
  });
});
