// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  extractArticleMarkdown,
  extractContent,
  turndownHtml,
} from '@domain/extractor/content-extractor';

const BASE = 'https://example.com/';

beforeEach(() => {
  document.title = '';
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

/**
 * Minimal XPath helper used by tests only — not part of the module under test.
 * Walks up the parent chain emitting `tagname[n]` segments.
 */
function getXPathOf(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let ix = 0;
    const parent = node.parentNode;
    const siblings: ChildNode[] = parent ? Array.from(parent.childNodes) : [];
    for (const sibling of siblings) {
      if (sibling === node) break;
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === node.tagName) {
        ix++;
      }
    }
    parts.unshift(`${node.tagName.toLowerCase()}[${ix + 1}]`);
    node = node.parentElement;
  }
  return '/' + parts.join('/');
}

describe('extractContent — basic markdown conversion', () => {
  it('converts a heading and paragraph to markdown', () => {
    document.title = 'My Article';
    document.body.innerHTML = '<h1>Hello</h1><p>World</p>';
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.markdown).toContain('# Hello');
    expect(result.markdown).toContain('World');
    expect(result.title).toBe('My Article');
  });

  it('converts a link to markdown link syntax', () => {
    document.body.innerHTML = '<p><a href="https://example.com">Example</a></p>';
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.markdown).toContain('[Example](https://example.com)');
  });

  it('converts a code block using GFM fenced syntax', () => {
    document.body.innerHTML = '<pre><code>const x = 1;</code></pre>';
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.markdown).toContain('```');
    expect(result.markdown).toContain('const x = 1;');
  });
});

describe('extractContent — excludedXPaths', () => {
  it('removes elements matching excludedXPaths before conversion', () => {
    document.body.innerHTML = `
      <div id="main"><p>Keep this</p></div>
      <aside id="sidebar"><p>Remove this</p></aside>
    `;
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) throw new Error('test fixture missing #sidebar');
    const sidebarXPath = getXPathOf(sidebar);
    const result = extractContent(document, {
      baseUrl: BASE,
      excludedXPaths: [sidebarXPath],
    });
    expect(result.markdown).toContain('Keep this');
    expect(result.markdown).not.toContain('Remove this');
  });

  it('silently ignores excluded xpaths that match nothing', () => {
    document.body.innerHTML = '<p>still here</p>';
    const result = extractContent(document, {
      baseUrl: BASE,
      excludedXPaths: ['/html/body/div[99]'],
    });
    expect(result.markdown).toContain('still here');
  });
});

describe('extractContent — includedXPaths', () => {
  it('retains only elements matching includedXPaths', () => {
    document.body.innerHTML = `
      <article id="article"><p>Include me</p></article>
      <footer id="footer"><p>Exclude me</p></footer>
    `;
    const article = document.getElementById('article');
    if (!article) throw new Error('test fixture missing #article');
    const articleXPath = getXPathOf(article);
    const result = extractContent(document, {
      baseUrl: BASE,
      includedXPaths: [articleXPath],
    });
    expect(result.markdown).toContain('Include me');
    expect(result.markdown).not.toContain('Exclude me');
  });

  it('keeps ancestor elements so a deeply nested match remains reachable', () => {
    document.body.innerHTML = `
      <main id="main"><section id="sect"><article id="article"><p>Deep include</p></article></section></main>
      <footer id="footer"><p>Drop footer</p></footer>
    `;
    const article = document.getElementById('article');
    if (!article) throw new Error('test fixture missing #article');
    const articleXPath = getXPathOf(article);
    const result = extractContent(document, {
      baseUrl: BASE,
      includedXPaths: [articleXPath],
    });
    expect(result.markdown).toContain('Deep include');
    expect(result.markdown).not.toContain('Drop footer');
  });

  it('is a no-op when no included xpath matches anything', () => {
    document.body.innerHTML = '<p>still here</p>';
    const result = extractContent(document, {
      baseUrl: BASE,
      includedXPaths: ['/html/body/div[99]'],
    });
    expect(result.markdown).toContain('still here');
  });
});

describe('extractContent — byline', () => {
  const BODY_FIXTURE = '<p>body</p>';

  it('reads author from meta name="author"', () => {
    document.head.innerHTML = '<meta name="author" content="Jane Doe">';
    document.body.innerHTML = BODY_FIXTURE;
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.byline).toBe('Jane Doe');
  });

  it('reads author from meta property="article:author"', () => {
    document.head.innerHTML = '<meta property="article:author" content="John Smith">';
    document.body.innerHTML = BODY_FIXTURE;
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.byline).toBe('John Smith');
  });

  it('returns undefined byline when no author meta is present', () => {
    document.body.innerHTML = BODY_FIXTURE;
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.byline).toBeUndefined();
  });
});

describe('extractContent — absolutizeUrls', () => {
  it('makes relative image src absolute', () => {
    document.body.innerHTML = '<img src="/images/photo.jpg" alt="photo">';
    const result = extractContent(document, { baseUrl: 'https://example.com/' });
    expect(result.markdown).toContain('https://example.com/images/photo.jpg');
  });
});

describe('extractContent — title fallback', () => {
  it('falls back to the first <h1> when document.title is empty', () => {
    document.body.innerHTML = '<h1>Heading Title</h1><p>body</p>';
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.title).toBe('Heading Title');
  });

  it('returns an empty title when neither title nor h1 is present', () => {
    document.body.innerHTML = '<p>just a paragraph</p>';
    const result = extractContent(document, { baseUrl: BASE });
    expect(result.title).toBe('');
  });
});

const PARAGRAPH_HTML = '<p>raw</p>';

describe('turndownHtml', () => {
  it('converts a simple paragraph HTML string to markdown', () => {
    expect(turndownHtml(PARAGRAPH_HTML)).toBe('raw');
  });

  it('converts a heading HTML string to atx-style markdown', () => {
    expect(turndownHtml('<h1>Hello</h1>')).toBe('# Hello');
  });

  it('converts an anchor HTML string to markdown link syntax', () => {
    expect(turndownHtml('<a href="https://example.com">Example</a>')).toBe(
      '[Example](https://example.com)',
    );
  });

  it('returns an empty string when given empty HTML', () => {
    expect(turndownHtml('')).toBe('');
  });

  it('trims surrounding whitespace from converted output', () => {
    const result = turndownHtml('<p>  spaced  </p>');
    expect(result.startsWith(' ')).toBe(false);
    expect(result.endsWith(' ')).toBe(false);
  });

  it('parses HTML via DOMParser so it is compatible with MV3 service workers where document is absent', () => {
    // In Chrome MV3 background service workers `document` does not exist, but
    // `DOMParser` does. We verify turndownHtml uses DOMParser so it works in
    // that environment without relying on `document.implementation.createHTMLDocument`.
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const result = turndownHtml(PARAGRAPH_HTML);
    expect(result).toBe('raw');
    expect(parseSpy).toHaveBeenCalledWith(PARAGRAPH_HTML, 'text/html');
    parseSpy.mockRestore();
  });
});

const ARTICLE_URL = 'https://example.com';

describe('extractArticleMarkdown', () => {
  it('returns an empty string when given empty HTML', async () => {
    expect(await extractArticleMarkdown('', ARTICLE_URL)).toBe('');
  });

  it('extracts and converts article text from a full document with surrounding noise', async () => {
    const html = `<!DOCTYPE html>
<html>
  <head><title>Test Article</title></head>
  <body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <article>
      <h1>The Real Article</h1>
      <p>This is the main article content that should be extracted.</p>
    </article>
    <aside><p>Related links sidebar</p></aside>
    <footer><p>Copyright 2026</p></footer>
  </body>
</html>`;
    const result = await extractArticleMarkdown(html, `${ARTICLE_URL}/article`);
    expect(result).toContain('The Real Article');
    expect(result).toContain('main article content');
  });

  it('converts simple paragraph HTML to markdown text', async () => {
    const html = '<html><body><p>hello world</p></body></html>';
    const result = await extractArticleMarkdown(html, ARTICLE_URL);
    expect(result).toContain('hello world');
  });

  it('uses DOMParser so it is compatible with MV3 service workers', async () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    await extractArticleMarkdown('<html><body><p>test</p></body></html>', ARTICLE_URL);
    expect(parseSpy).toHaveBeenCalledWith(expect.any(String), 'text/html');
    parseSpy.mockRestore();
  });
});
