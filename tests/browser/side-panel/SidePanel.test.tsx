// tests/browser/side-panel/SidePanel.test.tsx
//
// Browser-mode smoke tests for the side panel root component. The side panel
// reuses popup primitives (destination selector, save button, markdown
// preview) but omits the full settings navigation surface. Run via
// @vitest/browser against real Chromium so Radix portals and computed layout
// values behave the same way they do in the production extension.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { SidePanel } from '@presentation/side-panel/SidePanel';

describe('SidePanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = render(<SidePanel />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the destination selector', () => {
    render(<SidePanel />);
    expect(document.querySelector('[data-testid="destination-selector"]')).not.toBeNull();
  });

  it('renders the save button', () => {
    render(<SidePanel />);
    expect(document.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('renders the markdown preview area', () => {
    render(<SidePanel />);
    expect(document.querySelector('[data-testid="markdown-preview"]')).not.toBeNull();
  });

  it('does not render full settings navigation', () => {
    const { container } = render(<SidePanel />);
    expect(container.textContent ?? '').not.toMatch(/settings/i);
  });
});
