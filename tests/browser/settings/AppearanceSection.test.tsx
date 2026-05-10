// tests/browser/settings/AppearanceSection.test.tsx
//
// vi.mock calls are hoisted by Vitest before import resolution, so
// AppearanceSection and useSettingsStore both see the mocked versions.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppearanceSection } from '@presentation/settings/sections/AppearanceSection';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import type { SettingsStoreState } from '@presentation/stores/useSettingsStore';
import { applyThemeToDocument } from '@presentation/theme/applyTheme';
import type { AppSettings } from '@shared/types';

vi.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: vi.fn(),
}));

vi.mock('@presentation/theme/applyTheme', () => ({ applyThemeToDocument: vi.fn() }));

const mockUpdateSettings = vi.fn();

const baseSettings: AppSettings = {
  version: 1,
  theme: 'dark',
  locale: 'en',
  defaultDestinationId: null,
  defaultTemplateId: null,
  customCss: '',
  fontSize: 13,
};

function setupStore(overrides: Partial<AppSettings> = {}): void {
  const state: Pick<SettingsStoreState, 'settings' | 'updateSettings'> = {
    settings: { ...baseSettings, ...overrides },
    updateSettings: mockUpdateSettings,
  };
  vi.mocked(useSettingsStore).mockImplementation((selector: unknown) =>
    (selector as (s: typeof state) => unknown)(state),
  );
}

describe('AppearanceSection — page chrome', () => {
  beforeEach(() => setupStore());
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the "Appearance" heading', () => {
    render(<AppearanceSection />);
    expect(screen.getByRole('heading', { name: /appearance/i })).toBeDefined();
  });

  it('renders the description text', () => {
    render(<AppearanceSection />);
    expect(screen.getByText(/theme, language, and visual preferences/i)).toBeDefined();
  });
});

describe('AppearanceSection — language field', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the language select with current locale', () => {
    setupStore({ locale: 'en' });
    render(<AppearanceSection />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('renders Korean option', () => {
    setupStore();
    render(<AppearanceSection />);
    expect(screen.getByRole('option', { name: /korean/i })).toBeDefined();
  });

  it('calls updateSettings with new locale on change', async () => {
    setupStore({ locale: 'en' });
    const user = userEvent.setup();
    render(<AppearanceSection />);
    await user.selectOptions(screen.getByRole('combobox'), 'ko');
    expect(mockUpdateSettings).toHaveBeenCalledWith({ locale: 'ko' });
  });
});

describe('AppearanceSection — theme field', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders three theme tiles', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    const tiles = screen.getAllByRole('button');
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('marks the current theme tile as pressed', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    const darkBtn = screen.getByRole('button', { name: /dark/i });
    expect(darkBtn.getAttribute('aria-pressed')).toBe('true');
    const lightBtn = screen.getByRole('button', { name: /light/i });
    expect(lightBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('calls updateSettings and applyThemeToDocument on tile click', async () => {
    setupStore({ theme: 'dark' });
    const user = userEvent.setup();
    render(<AppearanceSection />);
    await user.click(screen.getByRole('button', { name: /light/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'light' });
    expect(vi.mocked(applyThemeToDocument)).toHaveBeenCalledWith('light');
  });
});
