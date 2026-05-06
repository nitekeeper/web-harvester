// tests/browser/popup/icons.test.tsx
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import {
  FolderIcon,
  FileIcon,
  MetadataIcon,
  AppearanceIcon,
  AboutIcon,
} from '@presentation/components/icons';

const ARIA_HIDDEN_TRUE = 'true';
const SVG = 'svg';
const ARIA_HIDDEN = 'aria-hidden';

describe('new icons', () => {
  afterEach(() => {
    cleanup();
  });

  it('FolderIcon renders an aria-hidden SVG', () => {
    render(<FolderIcon />);
    const svg = document.querySelector(SVG);
    expect(svg?.getAttribute(ARIA_HIDDEN)).toBe(ARIA_HIDDEN_TRUE);
  });

  it('FileIcon renders an aria-hidden SVG', () => {
    render(<FileIcon />);
    const svg = document.querySelector(SVG);
    expect(svg?.getAttribute(ARIA_HIDDEN)).toBe(ARIA_HIDDEN_TRUE);
  });

  it('MetadataIcon renders an aria-hidden SVG', () => {
    render(<MetadataIcon />);
    const svg = document.querySelector(SVG);
    expect(svg?.getAttribute(ARIA_HIDDEN)).toBe(ARIA_HIDDEN_TRUE);
  });

  it('AppearanceIcon renders an aria-hidden SVG', () => {
    render(<AppearanceIcon />);
    const svg = document.querySelector(SVG);
    expect(svg?.getAttribute(ARIA_HIDDEN)).toBe(ARIA_HIDDEN_TRUE);
  });

  it('AboutIcon renders an aria-hidden SVG', () => {
    render(<AboutIcon />);
    const svg = document.querySelector(SVG);
    expect(svg?.getAttribute(ARIA_HIDDEN)).toBe(ARIA_HIDDEN_TRUE);
  });
});
