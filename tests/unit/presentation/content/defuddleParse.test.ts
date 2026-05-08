// tests/unit/presentation/content/defuddleParse.test.ts
//
// Unit tests for defuddleParse. Mocks the defuddle module so we can verify
// the clone-before-parse contract without running the full Defuddle pipeline.

import { vi, describe, it, expect, beforeEach } from 'vitest';

const URL = 'https://example.com';

/** Returns a mock Defuddle response. */
function mockResponse(overrides?: Record<string, unknown>) {
  return {
    content: '<p>extracted content</p>',
    title: 'Article Title',
    author: 'Author Name',
    published: '2024-01-01',
    domain: 'example.com',
    wordCount: 42,
    description: '',
    favicon: '',
    image: '',
    url: '',
    source: '',
    byline: '',
    language: '',
    parseTime: 0,
    site: '',
    schemaOrgData: {},
    ...overrides,
  };
}

/** Prepare mock for empty fields test. */
function setupEmptyFieldsMock() {
  const emptyResponse = mockResponse({
    title: '',
    author: '',
    published: '',
    domain: '',
    wordCount: 0,
    content: '<p>x</p>',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (() => ({ parse: () => emptyResponse })) as any;
}

// Mock must be hoisted before the module under test is imported.
vi.mock('defuddle', () => {
  const MockDefuddle = vi.fn().mockImplementation(() => ({
    parse: () => mockResponse(),
  }));
  return { default: MockDefuddle };
});

// Dynamic import after vi.mock so the mock is in place when the module loads.
const { defuddleParse, defuddleExtract } = await import('@presentation/content/defuddleParse');
const { default: MockDefuddle } = await import('defuddle');

describe('defuddleParse', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('passes a clone of the document to Defuddle, not the original', () => {
    defuddleParse(document, 'https://example.com/article');

    expect(vi.mocked(MockDefuddle)).toHaveBeenCalledOnce();
    const [docArg] = vi.mocked(MockDefuddle).mock.calls[0] as unknown as [Document];

    expect(docArg.nodeType).toBe(Node.DOCUMENT_NODE);
    expect(docArg).not.toBe(document);
  });

  it('passes the url as the second argument', () => {
    const url = 'https://example.com/test';
    defuddleParse(document, url);

    expect(vi.mocked(MockDefuddle)).toHaveBeenCalledOnce();
    const [, optionsArg] = vi.mocked(MockDefuddle).mock.calls[0] as unknown as [
      Document,
      { url: string },
    ];
    expect(optionsArg).toEqual({ url });
  });
});

describe('defuddleExtract', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('returns content from the Defuddle parse result', () => {
    const result = defuddleExtract(document, URL);
    expect(result.content).toBe('<p>extracted content</p>');
  });

  it('returns title, author, published, domain, wordCount', () => {
    const result = defuddleExtract(document, URL);
    expect(result.title).toBe('Article Title');
    expect(result.author).toBe('Author Name');
    expect(result.published).toBe('2024-01-01');
    expect(result.domain).toBe('example.com');
    expect(result.wordCount).toBe(42);
  });

  it('passes a clone, not the original document', () => {
    defuddleExtract(document, URL);
    const [docArg] = vi.mocked(MockDefuddle).mock.calls[0] as unknown as [Document];
    expect(docArg.nodeType).toBe(Node.DOCUMENT_NODE);
    expect(docArg).not.toBe(document);
  });

  it('defaults empty Defuddle fields to empty string / zero', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(setupEmptyFieldsMock());
    const result = defuddleExtract(document, URL);
    expect(result.title).toBe('');
    expect(result.author).toBe('');
    expect(result.wordCount).toBe(0);
  });
});
