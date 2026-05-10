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
const MOCK_AUTHOR = 'Jane Doe';
const MOCK_TAGS = 'web, development';
const MOCK_DESCRIPTION = 'A great article about web development';
const TEST_DATE = '2026-05-09';

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
 * The variable bag that TemplatePlugin supplies to render(). Includes the full
 * set of metadata variables added in the defuddleParseAll / ClipContent fix.
 */
const PLUGIN_VARIABLES = {
  content: 'Article body content',
  title: TEST_TITLE,
  url: TEST_URL,
  date: TEST_DATE,
  today: TEST_DATE,
  today_iso: `${TEST_DATE}T00:00:00.000Z`,
  selectedText: '',
  now: TEST_DATE,
  'page.title': TEST_TITLE,
  'page.url': TEST_URL,
  'page.domain': 'example.com',
  description: MOCK_DESCRIPTION,
  author: MOCK_AUTHOR,
  published: '2026-01-15',
  tags: MOCK_TAGS,
  'page.description': MOCK_DESCRIPTION,
  'page.published_date': '2026-01-15',
  'page.tags': MOCK_TAGS,
  'page.reading_time': '4 min',
  'meta.author': MOCK_AUTHOR,
  'meta.description': MOCK_DESCRIPTION,
  'meta.image': 'https://example.com/og-image.jpg',
  'meta.site_name': 'Example Blog',
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

describe('system templates — metadata variables resolve', () => {
  it('sys-default-article renders meta.author into the author field', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    const authorField = parseFrontmatterFields(result.output).find((f) => f.key === 'author');
    expect(authorField?.value).toBe(MOCK_AUTHOR);
  });

  it('sys-default-article renders page.tags into the tags field', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    const tagsField = parseFrontmatterFields(result.output).find((f) => f.key === 'tags');
    expect(tagsField?.value).toBe(MOCK_TAGS);
  });

  it('sys-default-article renders page.reading_time into the readtime field', async () => {
    const result = await makeService().render(SYS_DEFAULT_ID, PLUGIN_VARIABLES);
    const readtimeField = parseFrontmatterFields(result.output).find((f) => f.key === 'readtime');
    expect(readtimeField?.value).toBe('4 min');
  });

  it('sys-reference-citation renders meta.author into the author field', async () => {
    const result = await makeService().render(SYS_REFERENCE_ID, PLUGIN_VARIABLES);
    const authorField = parseFrontmatterFields(result.output).find((f) => f.key === 'author');
    expect(authorField?.value).toBe(MOCK_AUTHOR);
  });
});
