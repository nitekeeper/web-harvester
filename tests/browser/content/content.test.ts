// tests/browser/content/content.test.ts
//
// Browser-mode tests for defuddleParse. Runs in real Chromium so Defuddle's
// DOM operations match production content-script behaviour.

import { describe, it, expect, afterEach } from 'vitest';

import { defuddleParse } from '@presentation/content/defuddleParse';

const ARTICLE_HTML = `
  <nav id="sentinel-nav"><ul><li><a href="/">Home</a></li></ul></nav>
  <header id="sentinel-header"><h1 class="site-title">My Site</h1></header>
  <article id="sentinel-article">
    <h1>Article Heading</h1>
    <p>First paragraph with meaningful content for the Defuddle extractor.</p>
    <p>Second paragraph with more content so the heuristics treat this as an article.</p>
    <p>Third paragraph ensures sufficient length for Readability scoring to trigger.</p>
  </article>
  <footer id="sentinel-footer"><p>Copyright 2026</p></footer>
`;

const TEST_URL = 'https://example.com/article';
const STYLE_SENTINEL_ID = 'sentinel-style';

describe('defuddleParse', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.getElementById(STYLE_SENTINEL_ID)?.remove();
  });

  it('does not remove style elements from the source document', () => {
    const style = document.createElement('style');
    style.id = STYLE_SENTINEL_ID;
    style.textContent = 'body { font-weight: bold; }';
    document.head.appendChild(style);
    document.body.innerHTML = ARTICLE_HTML;

    defuddleParse(document, TEST_URL);

    // Defuddle/Readability preprocessing removes <style> elements when it
    // processes the live document. With cloneNode the style must stay.
    expect(document.getElementById(STYLE_SENTINEL_ID)).not.toBeNull();
  });

  it('does not mutate the source document body during parsing', () => {
    document.body.innerHTML = ARTICLE_HTML;
    const bodySnapshotBefore = document.body.innerHTML;

    defuddleParse(document, TEST_URL);

    expect(document.body.innerHTML).toBe(bodySnapshotBefore);
  });

  it('nav and footer sentinels survive the parse call', () => {
    document.body.innerHTML = ARTICLE_HTML;

    defuddleParse(document, TEST_URL);

    expect(document.getElementById('sentinel-nav')).not.toBeNull();
    expect(document.getElementById('sentinel-footer')).not.toBeNull();
  });

  it('returns markdown extracted from the article content', () => {
    document.body.innerHTML = ARTICLE_HTML;

    const markdown = defuddleParse(document, TEST_URL);

    expect(typeof markdown).toBe('string');
    expect(markdown.length).toBeGreaterThan(0);
  });
});
