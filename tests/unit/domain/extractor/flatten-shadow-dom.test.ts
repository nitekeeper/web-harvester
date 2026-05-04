// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';

import { flattenShadowDom } from '@domain/extractor/flatten-shadow-dom';

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

/**
 * Returns the element with the given id from a ShadowRoot, throwing if it is
 * missing. Mirrors `requireById` but scoped to a shadow tree.
 */
function requireByIdInShadow(root: ShadowRoot, id: string): HTMLElement {
  const el = root.getElementById(id);
  if (!el) throw new Error(`Shadow fixture missing element #${id}`);
  return el;
}

describe('flattenShadowDom', () => {
  it('does nothing when there are no shadow roots', () => {
    document.body.innerHTML = '<div><p>normal content</p></div>';
    const original = document.body.innerHTML;
    flattenShadowDom(document);
    expect(document.body.innerHTML).toBe(original);
  });

  it('marks elements that had shadow roots with data-clip-shadow="true"', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = requireById('host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span>shadow content</span>';

    flattenShadowDom(document);

    const placeholder = host.querySelector('[data-clip-shadow="true"]');
    expect(placeholder).not.toBeNull();
  });

  it('flattens shadow root content into the host', () => {
    document.body.innerHTML = '<section id="host"></section>';
    const host = requireById('host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<p>inside shadow</p>';

    flattenShadowDom(document);

    expect(host.textContent).toContain('inside shadow');
  });

  it('recurses into nested shadow roots', () => {
    document.body.innerHTML = '<div id="outer"></div>';
    const outer = requireById('outer');
    const outerShadow = outer.attachShadow({ mode: 'open' });
    outerShadow.innerHTML = '<div id="inner"></div>';

    const inner = requireByIdInShadow(outerShadow, 'inner');
    const innerShadow = inner.attachShadow({ mode: 'open' });
    innerShadow.innerHTML = '<span>deep</span>';

    flattenShadowDom(document);

    expect(outer.textContent).toContain('deep');
  });
});
