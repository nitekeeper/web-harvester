// tests/browser/settings/AppearanceSection.test.tsx
//
// vi.mock calls are hoisted by Vitest before import resolution, so
// AppearanceSection and useSettingsStore both see the mocked versions.

import { render, cleanup, screen, fireEvent } from '@testing-library/react';
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
const ATTR_ARIA_PRESSED = 'aria-pressed';

const baseSettings: AppSettings = {
  version: 1,
  theme: 'dark',
  locale: 'en',
  defaultDestinationId: null,
  defaultTemplateId: null,
  customCss: '',
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
    expect(
      screen.getByText(/theme, language, and visual preferences for the extension ui/i),
    ).toBeDefined();
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

  it('does not render a Japanese option', () => {
    setupStore();
    render(<AppearanceSection />);
    expect(screen.queryByRole('option', { name: /japanese/i })).toBeNull();
  });
});

describe('AppearanceSection — theme field', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders at least Light, Dark, and System tiles', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('marks the current theme tile as pressed', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    const darkBtn = screen.getByRole('button', { name: /dark/i });
    expect(darkBtn.getAttribute(ATTR_ARIA_PRESSED)).toBe('true');
    const lightBtn = screen.getByRole('button', { name: /light/i });
    expect(lightBtn.getAttribute(ATTR_ARIA_PRESSED)).toBe('false');
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

describe('AppearanceSection — custom CSS field — initial state', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows default seed when customCss is empty', () => {
    setupStore({ customCss: '' });
    render(<AppearanceSection />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toContain('Purple Midnight');
    expect(ta.value).toContain('--wh-accent');
    expect(ta.value).toContain('#a78bfa');
  });

  it('shows saved customCss when not empty', () => {
    setupStore({ customCss: ':root { --my-var: red; }' });
    render(<AppearanceSection />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toBe(':root { --my-var: red; }');
  });

  it('resets textarea to seed content on Reset click', () => {
    setupStore({ customCss: 'body { color: red; }' });
    render(<AppearanceSection />);
    fireEvent.click(screen.getByRole('button', { name: /reset to default/i }));
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toContain('Purple Midnight');
  });
});

describe('AppearanceSection — custom CSS field — autosave', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows "saving…" indicator while typing', () => {
    setupStore({ customCss: '' });
    vi.useFakeTimers();
    render(<AppearanceSection />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    expect(screen.getByText(/saving/i)).toBeDefined();
    vi.useRealTimers();
  });

  it('calls updateSettings after debounce', () => {
    setupStore({ customCss: '' });
    vi.useFakeTimers();
    render(<AppearanceSection />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    vi.advanceTimersByTime(600);
    expect(mockUpdateSettings).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('AppearanceSection — custom CSS field — injection gating', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not inject css when theme is not custom', () => {
    setupStore({ customCss: '', theme: 'dark' });
    vi.useFakeTimers();
    render(<AppearanceSection />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    vi.advanceTimersByTime(600);
    const el = document.getElementById('wh-custom-css');
    expect(el?.textContent ?? '').toBe('');
    vi.useRealTimers();
  });

  it('injects css when theme is custom', () => {
    setupStore({ customCss: '', theme: 'custom' });
    vi.useFakeTimers();
    render(<AppearanceSection />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ':root{}' } });
    vi.advanceTimersByTime(600);
    const el = document.getElementById('wh-custom-css');
    expect(el?.textContent).toBe(':root{}');
    vi.useRealTimers();
  });
});

describe('AppearanceSection — font size field removed', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not render a range slider', () => {
    setupStore();
    render(<AppearanceSection />);
    expect(screen.queryByRole('slider')).toBeNull();
  });
});

describe('AppearanceSection — Custom theme tile', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders four theme tiles including Custom', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    expect(screen.getByRole('button', { name: /^light$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^system$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^custom$/i })).toBeDefined();
  });

  it('marks the Custom tile as pressed when theme is custom', () => {
    setupStore({ theme: 'custom' });
    render(<AppearanceSection />);
    expect(screen.getByRole('button', { name: /^custom$/i }).getAttribute(ATTR_ARIA_PRESSED)).toBe(
      'true',
    );
  });

  it('calls updateSettings with custom on Custom tile click', async () => {
    setupStore({ theme: 'dark' });
    const user = userEvent.setup();
    render(<AppearanceSection />);
    await user.click(screen.getByRole('button', { name: /^custom$/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'custom' });
  });

  it('Custom tile has aria-description mentioning Custom CSS', () => {
    setupStore({ theme: 'dark' });
    render(<AppearanceSection />);
    const btn = screen.getByRole('button', { name: /^custom$/i });
    expect(btn.getAttribute('aria-description')).toMatch(/custom css/i);
  });
});
