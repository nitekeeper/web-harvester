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

const SVG_SELECTOR = 'svg';
const ARIA_HIDDEN_ATTR = 'aria-hidden';

describe('Icon components', () => {
  afterEach(() => {
    cleanup();
  });

  it('FolderIcon renders an aria-hidden SVG', () => {
    render(<FolderIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
  });

  it('FileIcon renders an aria-hidden SVG', () => {
    render(<FileIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
  });

  it('MetadataIcon renders an aria-hidden SVG', () => {
    render(<MetadataIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
  });

  it('AppearanceIcon renders an aria-hidden SVG', () => {
    render(<AppearanceIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
  });

  it('AboutIcon renders an aria-hidden SVG', () => {
    render(<AboutIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
  });
});
