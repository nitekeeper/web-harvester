import { describe, it, expect } from 'vitest';

import { defaultReaderSettings, type ReaderSettings } from '@application/ReaderService';
import { generateReaderCSS, READER_CSS } from '@domain/reader/reader-styles';

function settings(overrides: Partial<ReaderSettings> = {}): ReaderSettings {
  return { ...defaultReaderSettings(), ...overrides };
}

describe('generateReaderCSS — theme colors', () => {
  it('light theme: contains light bg and fg colors', () => {
    const css = generateReaderCSS(settings({ theme: 'light' }));
    expect(css).toContain('#fafaf8');
    expect(css).toContain('#1a1a1a');
  });

  it('dark theme: contains dark bg and fg colors', () => {
    const css = generateReaderCSS(settings({ theme: 'dark' }));
    expect(css).toContain('#1e1e1e');
    expect(css).toContain('#dadada');
  });

  it('sepia theme: contains sepia bg and fg colors', () => {
    const css = generateReaderCSS(settings({ theme: 'sepia' }));
    expect(css).toContain('#f4ecd8');
    expect(css).toContain('#3d2b1f');
  });

  it('auto theme: contains light defaults', () => {
    const css = generateReaderCSS(settings({ theme: 'auto' }));
    expect(css).toContain('#fafaf8');
  });

  it('auto theme: contains @media prefers-color-scheme: dark override', () => {
    const css = generateReaderCSS(settings({ theme: 'auto' }));
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('#1e1e1e');
  });
});

describe('generateReaderCSS — structure', () => {
  it('scopes all rules under #wh-reader-content', () => {
    const css = generateReaderCSS(settings());
    expect(css).toContain('#wh-reader-content');
  });

  it('does not include font-size or max-width hardcoded values — uses CSS custom properties', () => {
    const css = generateReaderCSS(settings({ fontSize: 99, maxWidth: 99 }));
    expect(css).toContain('var(--wh-reader-font-size');
    expect(css).toContain('var(--wh-reader-max-width');
  });

  it('uses custom fontFamily when not "default"', () => {
    const css = generateReaderCSS(settings({ fontFamily: 'Arial, sans-serif' }));
    expect(css).toContain('Arial, sans-serif');
  });

  it('uses Georgia stack when fontFamily is "default"', () => {
    const css = generateReaderCSS(settings({ fontFamily: 'default' }));
    expect(css).toContain('Georgia');
  });
});

describe('READER_CSS (deprecated)', () => {
  it('is a non-empty CSS string', () => {
    expect(typeof READER_CSS).toBe('string');
    expect(READER_CSS.length).toBeGreaterThan(0);
  });

  it('equals generateReaderCSS with default settings', () => {
    expect(READER_CSS).toBe(generateReaderCSS(defaultReaderSettings()));
  });
});
