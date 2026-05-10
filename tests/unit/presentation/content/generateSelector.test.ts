import { describe, expect, it } from 'vitest';

import { generateSelector } from '@presentation/content/generateSelector';

function el(html: string): Element {
  const div = document.createElement('div');
  div.innerHTML = html;
  const element = div.firstElementChild;
  if (!element) {
    throw new Error('Failed to parse HTML');
  }
  return element;
}

function withContainer(html: string, callback: (container: HTMLElement) => void): void {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    callback(container);
  } finally {
    document.body.removeChild(container);
  }
}

describe('generateSelector', () => {
  it('returns #id when element has a non-empty id', () => {
    const element = el('<p id="main-content">Hello</p>');
    expect(generateSelector(element)).toBe('#main-content');
  });

  it('returns tag.class when element has a unique class', () => {
    withContainer('<p class="byline">Author</p><p class="date">2024</p>', (container) => {
      const byline = container.querySelector('.byline');
      if (!byline) throw new Error('Could not find .byline element');
      const selector = generateSelector(byline);
      expect(selector).toContain('byline');
    });
  });

  it('returns a tag:nth-child selector as fallback', () => {
    withContainer('<span>A</span><span>B</span>', (container) => {
      const spans = container.querySelectorAll('span');
      const second = spans[1];
      if (!second) throw new Error('Could not find second span');
      const selector = generateSelector(second);
      expect(selector).toMatch(/span:nth-child\(2\)/);
    });
  });

  it('produces a selector that matches the original element', () => {
    const container = document.createElement('article');
    container.innerHTML = '<h1 class="headline">Title</h1>';
    document.body.appendChild(container);
    const h1 = container.querySelector('h1');
    if (!h1) throw new Error('Could not find h1 element');
    const selector = generateSelector(h1);
    expect(document.querySelector(selector)).toBe(h1);
    document.body.removeChild(container);
  });
});
