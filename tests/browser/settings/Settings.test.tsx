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
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

const SIDEBAR_ID = 'settings-sidebar';

function getSidebar() {
  return screen.getByTestId(SIDEBAR_ID);
}

function getSidebarButtons() {
  return getSidebar().querySelectorAll('button');
}

describe('Settings — layout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the WHLogo in the sidebar', () => {
    render(<Settings />);
    const svg = document.querySelector(`[data-testid="${SIDEBAR_ID}"] svg`);
    expect(svg).not.toBeNull();
  });

  it('renders the Web Harvester title in the sidebar', () => {
    render(<Settings />);
    expect(within(getSidebar()).getByText('Web Harvester')).not.toBeNull();
  });

  it('renders the Settings · v0.1.0 subtitle in the sidebar', () => {
    render(<Settings />);
    expect(within(getSidebar()).getByText('Settings · v0.1.0')).not.toBeNull();
  });

  it('renders 5 navigation buttons', () => {
    render(<Settings />);
    expect(getSidebarButtons().length).toBe(5);
  });

  it('defaults to the Destinations tab', () => {
    render(<Settings />);
    expect(document.querySelector('[data-testid="destinations-section"]')).not.toBeNull();
  });

  it('switches to the Appearance panel when clicked', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const buttons = getSidebarButtons();
    expect(document.querySelector('[data-testid="appearance-section"]')).toBeNull();
    const appearanceButton = Array.from(buttons).find((b) => b.textContent === 'Appearance');
    if (!appearanceButton) throw new Error('Appearance button not found in sidebar');
    await user.click(appearanceButton);
    expect(document.querySelector('[data-testid="appearance-section"]')).not.toBeNull();
  });
});

describe('Settings — plugins tab', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a Plugins navigation button', () => {
    render(<Settings />);
    const buttons = getSidebarButtons();
    const found = Array.from(buttons).some((b) => b.textContent?.trim() === 'Plugins');
    expect(found).toBe(true);
  });

  it('does not render a Debug navigation button', () => {
    render(<Settings />);
    const buttons = getSidebarButtons();
    const found = Array.from(buttons).some((b) => b.textContent?.trim() === 'Debug');
    expect(found).toBe(false);
  });

  it('switches to the Plugins panel when clicked', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const buttons = getSidebarButtons();
    const pluginsButton = Array.from(buttons).find((b) => b.textContent?.trim() === 'Plugins');
    if (!pluginsButton) throw new Error('Plugins button not found');
    await user.click(pluginsButton);
    expect(document.querySelector('[data-testid="plugins-section"]')).not.toBeNull();
  });
});

describe('Settings store — plugins slice', () => {
  afterEach(() => {
    useSettingsStore.getState().setPlugins([]);
  });

  it('has an empty plugins array by default', () => {
    expect(useSettingsStore.getState().plugins).toEqual([]);
  });

  it('setPlugins replaces the plugins array', () => {
    useSettingsStore.getState().setPlugins([{ id: 'x', name: 'X', state: 'active' }]);
    expect(useSettingsStore.getState().plugins).toEqual([{ id: 'x', name: 'X', state: 'active' }]);
  });
});
