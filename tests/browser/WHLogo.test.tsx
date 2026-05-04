// tests/browser/WHLogo.test.tsx
//
// Browser-mode tests for the Web Harvester logo. Asserts the SVG renders,
// honours its size prop, forwards a className, and includes the six C6 hex
// faces.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { WHLogo } from '@presentation/components/WHLogo';

describe('WHLogo', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an svg element', () => {
    const { container } = render(<WHLogo />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('applies the supplied size to width and height', () => {
    const { container } = render(<WHLogo size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('defaults to size 18', () => {
    const { container } = render(<WHLogo />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('18');
  });

  it('forwards a custom className to the svg', () => {
    const { container } = render(<WHLogo className="text-primary" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains('text-primary')).toBe(true);
  });

  it('renders six face paths inside the group', () => {
    const { container } = render(<WHLogo />);
    const paths = container.querySelectorAll('g > path');
    expect(paths.length).toBe(6);
  });
});
