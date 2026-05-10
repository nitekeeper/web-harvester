// tests/unit/presentation/content/defuddleParse.test.ts
//
// Unit tests for defuddleParse. Mocks the defuddle module so we can verify
// the clone-before-parse contract without running the full Defuddle pipeline.

import { vi, describe, it, expect, beforeEach } from 'vitest';

const URL = 'https://example.com';
const MOCK_AUTHOR = 'Author Name';
const MOCK_PUBLISHED = '2024-01-01';
const MOCK_DESCRIPTION = 'An article about web development';
const MOCK_IMAGE = 'https://example.com/og-image.jpg';
const MOCK_SITE = 'Example Site';
const MOCK_SCHEMA = { '@type': 'Article', author: 'Jane Doe' };
const MOCK_ALL_META_TAGS = [
  { name: 'keywords', property: null, content: 'web, development' },
  { name: null, property: 'og:image', content: 'https://example.com/img.jpg' },
];

/** Returns a mock Defuddle response. */
function mockResponse(overrides?: Record<string, unknown>) {
  return {
    content: '<p>extracted content</p>',
    title: 'Article Title',
    author: MOCK_AUTHOR,
    published: MOCK_PUBLISHED,
    domain: 'example.com',
    wordCount: 42,
    description: MOCK_DESCRIPTION,
    favicon: '',
    image: MOCK_IMAGE,
    url: '',
    source: '',
    byline: '',
    language: '',
    parseTime: 0,
    site: MOCK_SITE,
    schemaOrgData: MOCK_SCHEMA,
    metaTags: MOCK_ALL_META_TAGS,
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
const { defuddleParse, defuddleExtract, defuddleParseAll } =
  await import('@presentation/content/defuddleParse');
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
    expect(result.author).toBe(MOCK_AUTHOR);
    expect(result.published).toBe(MOCK_PUBLISHED);
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

describe('defuddleParseAll — basic fields', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('returns markdown converted from Defuddle content', () => {
    const { markdown } = defuddleParseAll(document, URL);
    expect(typeof markdown).toBe('string');
  });

  it('returns description from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.description).toBe(MOCK_DESCRIPTION);
  });

  it('returns author from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.author).toBe(MOCK_AUTHOR);
  });

  it('returns published from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.published).toBe(MOCK_PUBLISHED);
  });

  it('returns image from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.image).toBe(MOCK_IMAGE);
  });

  it('returns site from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.site).toBe(MOCK_SITE);
  });

  it('returns wordCount from the Defuddle parse result', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.wordCount).toBe(42);
  });
});

describe('defuddleParseAll — tags extraction', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('extracts tags from the keywords meta tag', () => {
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.tags).toBe('web, development');
  });

  it('returns empty tags when no keywords meta tag exists', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(
      () =>
        ({
          parse: () => mockResponse({ metaTags: [] }),
        }) as unknown as InstanceType<typeof MockDefuddle>,
    );
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.tags).toBe('');
  });

  it('returns empty tags when metaTags is absent', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(
      () =>
        ({
          parse: () => mockResponse({ metaTags: undefined }),
        }) as unknown as InstanceType<typeof MockDefuddle>,
    );
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.tags).toBe('');
  });
});

describe('defuddleParseAll — edge cases', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('defaults empty strings for missing metadata fields', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(
      () =>
        ({
          parse: () =>
            mockResponse({
              description: undefined,
              author: undefined,
              published: undefined,
              image: undefined,
              site: undefined,
              wordCount: undefined,
              metaTags: undefined,
            }),
        }) as unknown as InstanceType<typeof MockDefuddle>,
    );
    const { meta } = defuddleParseAll(document, URL);
    expect(meta.description).toBe('');
    expect(meta.author).toBe('');
    expect(meta.published).toBe('');
    expect(meta.image).toBe('');
    expect(meta.site).toBe('');
    expect(meta.wordCount).toBe(0);
    expect(meta.tags).toBe('');
  });

  it('passes a clone of the document to Defuddle, not the original', () => {
    defuddleParseAll(document, URL);
    const [docArg] = vi.mocked(MockDefuddle).mock.calls[0] as unknown as [Document];
    expect(docArg.nodeType).toBe(Node.DOCUMENT_NODE);
    expect(docArg).not.toBe(document);
  });
});

describe('defuddleParseAll — schemaOrgData and allMetaTags', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('returns schemaOrgData from the Defuddle parse result', () => {
    const { schemaOrgData } = defuddleParseAll(document, URL);
    expect(schemaOrgData).toEqual(MOCK_SCHEMA);
  });

  it('returns empty object for schemaOrgData when absent', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(
      () =>
        ({
          parse: () => mockResponse({ schemaOrgData: undefined }),
        }) as unknown as InstanceType<typeof MockDefuddle>,
    );
    const { schemaOrgData } = defuddleParseAll(document, URL);
    expect(schemaOrgData).toEqual({});
  });

  it('returns allMetaTags from the Defuddle parse result', () => {
    const { allMetaTags } = defuddleParseAll(document, URL);
    expect(allMetaTags).toEqual(MOCK_ALL_META_TAGS);
  });

  it('returns empty array for allMetaTags when metaTags is absent', () => {
    vi.mocked(MockDefuddle).mockImplementationOnce(
      () =>
        ({
          parse: () => mockResponse({ metaTags: undefined }),
        }) as unknown as InstanceType<typeof MockDefuddle>,
    );
    const { allMetaTags } = defuddleParseAll(document, URL);
    expect(allMetaTags).toEqual([]);
  });
});
