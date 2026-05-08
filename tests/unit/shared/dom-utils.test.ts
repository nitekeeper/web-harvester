// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';

import { getElementXPath, getElementByXPath } from '@shared/dom-utils';

describe('getElementXPath', () => {
  it('returns a path ending in /tagname[1] for a single child element', () => {
    document.body.innerHTML = '<div><p id="target">hello</p></div>';
    const el = document.getElementById('target');
    if (!el) throw new Error('missing #target');
    expect(getElementXPath(el)).toMatch(/\/p\[1\]$/);
  });

  it('returns distinct paths for sibling paragraphs', () => {
    document.body.innerHTML = '<div><p>first</p><p id="second">second</p></div>';
    const el = document.getElementById('second');
    if (!el) throw new Error('missing #second');
    expect(getElementXPath(el)).toMatch(/\/p\[2\]$/);
  });
});

describe('getElementByXPath', () => {
  it('resolves the element at the given xpath', () => {
    document.body.innerHTML = '<section><article><p id="target">text</p></article></section>';
    const el = document.getElementById('target');
    if (!el) throw new Error('missing #target');
    const xpath = getElementXPath(el);
    const resolved = getElementByXPath(xpath, document);
    expect(resolved).toBe(el);
  });

  it('returns null for a non-existent xpath', () => {
    expect(getElementByXPath('/html/body/nonexistent[1]', document)).toBeNull();
  });
});
