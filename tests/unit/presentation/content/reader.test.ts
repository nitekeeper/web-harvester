// tests/unit/presentation/content/reader.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@presentation/content/defuddleParse', () => ({
  defuddleExtract: vi.fn().mockResolvedValue({
    content: '<p>Article body text</p>',
    title: 'My Article',
    author: 'Jane Doe',
    published: '',
    domain: 'example.com',
    wordCount: 50,
  }),
}));

vi.mock('@domain/reader/reader-styles', () => ({
  generateReaderCSS: vi.fn().mockReturnValue('body{color:red}'),
}));

const { activateReader, deactivateReader } = await import('@presentation/content/reader');

const SETTINGS = {
  fontSize: 16,
  lineHeight: 1.6,
  maxWidth: 38,
  theme: 'light' as const,
  fontFamily: 'default',
  showHighlights: true,
};

const INITIAL_BODY = '<div id="app"><h1>Original page</h1></div>';
const CLASS_THEME_LIGHT = 'theme-light';
const CLASS_THEME_DARK = 'theme-dark';
const CLASS_THEME_SEPIA = 'theme-sepia';

beforeEach(() => {
  document.body.innerHTML = INITIAL_BODY;
  document.documentElement.removeAttribute('style');
  document.documentElement.className = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  deactivateReader();
});

describe('activateReader — DOM structure', () => {
  it('replaces body with #wh-reader-content', async () => {
    await activateReader(SETTINGS);
    expect(document.getElementById('wh-reader-content')).not.toBeNull();
  });

  it('includes article content from defuddleExtract', async () => {
    await activateReader(SETTINGS);
    const article = document.getElementById('wh-reader-article');
    expect(article?.innerHTML).toContain('Article body text');
  });

  it('renders the title in #wh-reader-title', async () => {
    await activateReader(SETTINGS);
    expect(document.getElementById('wh-reader-title')?.textContent).toBe('My Article');
  });

  it('renders the byline when author is non-empty', async () => {
    await activateReader(SETTINGS);
    expect(document.getElementById('wh-reader-byline')?.textContent).toBe('Jane Doe');
  });

  it('injects <style id="wh-reader-style"> into head', async () => {
    await activateReader(SETTINGS);
    const style = document.getElementById('wh-reader-style');
    expect(style?.tagName).toBe('STYLE');
    expect(style?.textContent).toBe('body{color:red}');
  });
});

describe('activateReader — CSS custom properties', () => {
  it('sets --wh-reader-font-size on documentElement', async () => {
    await activateReader({ ...SETTINGS, fontSize: 18 });
    expect(document.documentElement.style.getPropertyValue('--wh-reader-font-size')).toBe('18px');
  });

  it('sets --wh-reader-line-height on documentElement', async () => {
    await activateReader({ ...SETTINGS, lineHeight: 1.8 });
    expect(document.documentElement.style.getPropertyValue('--wh-reader-line-height')).toBe('1.8');
  });

  it('sets --wh-reader-max-width on documentElement', async () => {
    await activateReader({ ...SETTINGS, maxWidth: 40 });
    expect(document.documentElement.style.getPropertyValue('--wh-reader-max-width')).toBe('40em');
  });
});

describe('activateReader — theme classes', () => {
  it('adds theme-light class for light theme', async () => {
    await activateReader({ ...SETTINGS, theme: 'light' });
    expect(document.documentElement.classList.contains(CLASS_THEME_LIGHT)).toBe(true);
  });

  it('adds theme-dark class for dark theme', async () => {
    await activateReader({ ...SETTINGS, theme: 'dark' });
    expect(document.documentElement.classList.contains(CLASS_THEME_DARK)).toBe(true);
  });

  it('adds theme-sepia class for sepia theme', async () => {
    await activateReader({ ...SETTINGS, theme: 'sepia' });
    expect(document.documentElement.classList.contains(CLASS_THEME_SEPIA)).toBe(true);
  });

  it('adds no theme class for auto theme', async () => {
    await activateReader({ ...SETTINGS, theme: 'auto' });
    expect(document.documentElement.classList.contains(CLASS_THEME_LIGHT)).toBe(false);
    expect(document.documentElement.classList.contains(CLASS_THEME_DARK)).toBe(false);
    expect(document.documentElement.classList.contains(CLASS_THEME_SEPIA)).toBe(false);
  });
});

describe('deactivateReader', () => {
  it('restores the saved body HTML', async () => {
    await activateReader(SETTINGS);
    deactivateReader();
    expect(document.body.innerHTML).toBe(INITIAL_BODY);
  });

  it('removes #wh-reader-style from head', async () => {
    await activateReader(SETTINGS);
    deactivateReader();
    expect(document.getElementById('wh-reader-style')).toBeNull();
  });

  it('removes --wh-reader-font-size from documentElement', async () => {
    await activateReader(SETTINGS);
    deactivateReader();
    expect(document.documentElement.style.getPropertyValue('--wh-reader-font-size')).toBe('');
  });

  it('removes theme-light class', async () => {
    await activateReader(SETTINGS);
    deactivateReader();
    expect(document.documentElement.classList.contains(CLASS_THEME_LIGHT)).toBe(false);
  });
});
