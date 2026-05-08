// tests/unit/presentation/content/defuddleParse.test.ts
//
// Unit tests for defuddleParse. Mocks the defuddle module so we can verify
// the clone-before-parse contract without running the full Defuddle pipeline.

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock must be hoisted before the module under test is imported.
vi.mock('defuddle', () => {
  const MockDefuddle = vi.fn().mockImplementation(() => ({
    parse: () => ({ content: '<p>extracted content</p>' }),
  }));
  return { default: MockDefuddle };
});

// Dynamic import after vi.mock so the mock is in place when the module loads.
const { defuddleParse } = await import('@presentation/content/defuddleParse');
const { default: MockDefuddle } = await import('defuddle');

describe('defuddleParse', () => {
  beforeEach(() => {
    vi.mocked(MockDefuddle).mockClear();
  });

  it('passes a clone of the document to Defuddle, not the original', () => {
    defuddleParse(document, 'https://example.com/article');

    expect(vi.mocked(MockDefuddle)).toHaveBeenCalledOnce();
    const [docArg] = vi.mocked(MockDefuddle).mock.calls[0] as unknown as [Document];

    // The argument must be a Document node (cloneNode returns a Document)
    // but must NOT be the same reference as the live document.
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
