// tests/browser/settings/Settings.test.tsx
//
// Browser-mode tests for the settings SPA root layout. Asserts that the
// two-column shell renders the WHLogo, branding text scoped to the sidebar,
// and that the five sidebar navigation buttons switch the active panel
// when clicked.

import { render, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    render(<Settings />);
    const sidebar = screen.getByTestId('settings-sidebar');
    // Scope the title assertion to the sidebar so a stray match elsewhere
    // (e.g. a panel heading) cannot make this test pass.
    expect(within(sidebar).getByText('Web Harvester')).not.toBeNull();
  });

  it('renders 5 navigation buttons and switches panels on click', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const sidebar = screen.getByTestId('settings-sidebar');
    const buttons = sidebar.querySelectorAll('button');
    expect(buttons.length).toBe(5);

    // Theme panel is not mounted by Radix Tabs while another tab is active.
    expect(document.querySelector('[data-testid="theme-section"]')).toBeNull();

    const themeButton = Array.from(buttons).find((b) => b.textContent === 'Theme');
    if (!themeButton) throw new Error('Theme button not found in sidebar');
    await user.click(themeButton);

    // After clicking Theme, the Theme panel content must be rendered.
    expect(document.querySelector('[data-testid="theme-section"]')).not.toBeNull();
  });
});
