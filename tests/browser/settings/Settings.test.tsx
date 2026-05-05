// tests/browser/settings/Settings.test.tsx
//
// Browser-mode tests for the settings SPA root layout. Asserts that the
// two-column shell renders the WHLogo, branding text, and sidebar navigation
// container.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Settings } from '@presentation/settings/Settings';

describe('Settings — layout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the WHLogo in the sidebar', () => {
    render(<Settings />);
    const svg = document.querySelector('[data-testid="settings-sidebar"] svg');
    expect(svg).not.toBeNull();
  });

  it('renders the Web Harvester title in the sidebar', () => {
    const { getAllByText } = render(<Settings />);
    // may appear in multiple places — we just care it's present
    expect(getAllByText('Web Harvester').length).toBeGreaterThan(0);
  });

  it('renders sidebar navigation buttons', () => {
    render(<Settings />);
    expect(document.querySelector('[data-testid="settings-sidebar"]')).not.toBeNull();
  });
});
