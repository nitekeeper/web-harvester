// tests/browser/popup/icons.test.tsx
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import {
  FolderIcon,
  FileIcon,
  MetadataIcon,
  AppearanceIcon,
  AboutIcon,
  ChevIcon,
  PlusIcon,
  CaretDownIcon,
} from '@presentation/components/icons';

const SVG_SELECTOR = 'svg';
const ARIA_HIDDEN_ATTR = 'aria-hidden';

describe('FolderIcon', () => {
  afterEach(cleanup);

  it('renders an aria-hidden SVG at 14px', () => {
    render(<FolderIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
    expect(svg?.getAttribute('width')).toBe('14');
    expect(svg?.getAttribute('height')).toBe('14');
  });

  it('contains a plus glyph (two crossing lines)', () => {
    render(<FolderIcon />);
    const lines = document.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FileIcon', () => {
  afterEach(cleanup);

  it('renders an aria-hidden SVG at 13px', () => {
    render(<FileIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
    expect(svg?.getAttribute('width')).toBe('13');
    expect(svg?.getAttribute('height')).toBe('13');
  });
});

describe('Settings nav icons', () => {
  afterEach(cleanup);

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

describe('ChevIcon', () => {
  afterEach(cleanup);

  it('renders an aria-hidden SVG at 11px', () => {
    render(<ChevIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
    expect(svg?.getAttribute('width')).toBe('11');
    expect(svg?.getAttribute('height')).toBe('11');
  });

  it('forwards className to the SVG', () => {
    render(<ChevIcon className="rotate-180" />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg?.classList.contains('rotate-180')).toBe(true);
  });
});

describe('PlusIcon', () => {
  afterEach(cleanup);

  it('renders an aria-hidden SVG at 12px', () => {
    render(<PlusIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
    expect(svg?.getAttribute('width')).toBe('12');
    expect(svg?.getAttribute('height')).toBe('12');
  });
});

describe('CaretDownIcon', () => {
  afterEach(cleanup);

  it('renders an aria-hidden SVG at 9px with fill="currentColor"', () => {
    render(<CaretDownIcon />);
    const svg = document.querySelector(SVG_SELECTOR);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute(ARIA_HIDDEN_ATTR)).toBe('true');
    expect(svg?.getAttribute('width')).toBe('9');
    expect(svg?.getAttribute('height')).toBe('9');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
  });
});
