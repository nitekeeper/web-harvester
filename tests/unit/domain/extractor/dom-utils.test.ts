// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';

import {
  getElementXPath,
  getElementByXPath,
  setElementHTML,
  serializeChildren,
  absolutizeUrls,
} from '@domain/extractor/dom-utils';

/**
 * Returns the element with the given id from the current document, throwing if
 * it is missing. Avoids non-null assertions (`!`) in tests while keeping the
 * narrowed `HTMLElement` type at call sites.
 */
function requireById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Test fixture missing element #${id}`);
  return el;
}

describe('getElementXPath', () => {
  it('returns a path for an element with no siblings of the same tag', () => {
    document.body.innerHTML = '<div><p id="target">hello</p></div>';
    const el = requireById('target');
    const xpath = getElementXPath(el);
    expect(xpath).toMatch(/\/p\[1\]$/);
  });

  it('returns distinct paths for sibling paragraphs', () => {
    document.body.innerHTML = '<div><p>first</p><p id="second">second</p></div>';
    const second = requireById('second');
    const xpath = getElementXPath(second);
    expect(xpath).toMatch(/\/p\[2\]$/);
  });

  it('round-trips via getElementByXPath', () => {
    document.body.innerHTML = '<section><article><p id="target">text</p></article></section>';
    const el = requireById('target');
    const xpath = getElementXPath(el);
    const found = getElementByXPath(xpath, document);
    expect(found).toBe(el);
  });

  it('returns empty string for the document root itself', () => {
    expect(getElementXPath(document)).toBe('');
  });

  it('returns empty string for a detached element with no parent', () => {
    const detached = document.createElement('div');
    expect(getElementXPath(detached)).toBe('');
  });

  it('walks up through non-element nodes (e.g. text nodes)', () => {
    document.body.innerHTML = '<p id="target">hello</p>';
    const target = requireById('target');
    const textNode = target.firstChild;
    if (!textNode) throw new Error('expected text node child');
    const xpath = getElementXPath(textNode);
    expect(xpath).toMatch(/\/p\[1\]$/);
  });
});

describe('getElementByXPath', () => {
  it('returns null for a non-matching xpath', () => {
    document.body.innerHTML = '<p>hello</p>';
    const result = getElementByXPath('/html/body/div[99]', document);
    expect(result).toBeNull();
  });
});

describe('setElementHTML', () => {
  it('replaces element content safely', () => {
    document.body.innerHTML = '<div id="target">old</div>';
    const el = requireById('target');
    setElementHTML(el, '<span>new</span>');
    expect(el.innerHTML).toBe('<span>new</span>');
  });

  it('replaces previous content entirely', () => {
    document.body.innerHTML = '<div id="target"><b>bold</b></div>';
    const el = requireById('target');
    setElementHTML(el, 'plain text');
    expect(el.textContent).toBe('plain text');
    expect(el.querySelector('b')).toBeNull();
  });
});

describe('serializeChildren', () => {
  it('serializes element children to html string', () => {
    document.body.innerHTML = '<div id="target"><span>one</span><span>two</span></div>';
    const el = requireById('target');
    const result = serializeChildren(el);
    expect(result).toBe('<span>one</span><span>two</span>');
  });

  it('escapes text nodes containing special chars', () => {
    document.body.innerHTML = '';
    const el = document.createElement('div');
    el.appendChild(document.createTextNode('<script>alert(1)</script>'));
    const result = serializeChildren(el);
    expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('serializes comment nodes', () => {
    const el = document.createElement('div');
    el.appendChild(document.createComment('a comment'));
    const result = serializeChildren(el);
    expect(result).toBe('<!--a comment-->');
  });

  it('returns empty string for nodes that are not element/text/comment', () => {
    const xmlDoc = document.implementation.createDocument(null, 'root', null);
    const root = xmlDoc.documentElement;
    const pi = xmlDoc.createProcessingInstruction('target', 'data');
    root.appendChild(pi);
    const result = serializeChildren(root);
    expect(result).toBe('');
  });
});

const BASE = 'https://example.com/article/';

describe('absolutizeUrls — basic resolution', () => {
  it('converts relative src to absolute', () => {
    const result = absolutizeUrls('<img src="images/photo.jpg">', BASE);
    expect(result).toContain('https://example.com/article/images/photo.jpg');
  });

  it('converts relative href to absolute', () => {
    const result = absolutizeUrls('<a href="../about.html">link</a>', BASE);
    expect(result).toContain('https://example.com/about.html');
  });

  it('leaves absolute http URLs unchanged', () => {
    const html = '<img src="https://cdn.example.com/img.png">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('https://cdn.example.com/img.png');
  });

  it('leaves data URLs unchanged', () => {
    const html = '<img src="data:image/png;base64,abc">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('data:image/png;base64,abc');
  });

  it('leaves protocol-relative URLs unchanged', () => {
    const html = '<img src="//cdn.example.com/img.png">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('//cdn.example.com/img.png');
  });
});

describe('absolutizeUrls — srcset and edge cases', () => {
  it('handles srcset with multiple entries', () => {
    const html = '<img srcset="small.jpg 480w, large.jpg 800w">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('https://example.com/article/small.jpg 480w');
    expect(result).toContain('https://example.com/article/large.jpg 800w');
  });

  it('preserves srcset entries when URL construction fails', () => {
    const html = '<img srcset="small.jpg 480w, large.jpg 800w">';
    const result = absolutizeUrls(html, 'not a valid base');
    expect(result).toContain('small.jpg 480w');
    expect(result).toContain('large.jpg 800w');
  });

  it('leaves src unchanged when URL construction fails', () => {
    const html = '<img src="relative.jpg">';
    const result = absolutizeUrls(html, 'not a valid base');
    expect(result).toContain('relative.jpg');
  });

  it('preserves srcset entries that have no url after trimming', () => {
    const html = '<img srcset="small.jpg 480w, ">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('https://example.com/article/small.jpg 480w');
  });

  it('handles a single srcset url with no descriptor', () => {
    const html = '<img srcset="single.jpg">';
    const result = absolutizeUrls(html, BASE);
    expect(result).toContain('https://example.com/article/single.jpg');
  });
});
