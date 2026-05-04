import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IPluginContext } from '@domain/types';
import { ThemePlugin } from '@plugins/theme/ThemePlugin';

import { createMockContext } from '../../helpers/createMockContext';

/** Mutable variant of MediaQueryList so tests can flip `matches` at runtime. */
interface MutableMediaQueryList extends MediaQueryList {
  matches: boolean;
}

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface ThemeTestHarness {
  plugin: ThemePlugin;
  ctx: IPluginContext;
  mockMediaQuery: MutableMediaQueryList;
}

/** Builds a fresh ThemePlugin + mock context + mock matchMedia listener. */
function setupHarness(): ThemeTestHarness {
  const plugin = new ThemePlugin();
  const ctx = createMockContext();

  const mockMediaQuery = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
  } as unknown as MutableMediaQueryList;

  vi.spyOn(window, 'matchMedia').mockReturnValue(mockMediaQuery);

  document.documentElement.className = '';
  vi.spyOn(document.documentElement.style, 'setProperty').mockImplementation(() => {});
  vi.spyOn(document.documentElement.classList, 'add').mockImplementation(() => {});
  vi.spyOn(document.documentElement.classList, 'remove').mockImplementation(() => {});

  return { plugin, ctx, mockMediaQuery };
}

describe('ThemePlugin — manifest', () => {
  let plugin: ThemePlugin;

  beforeEach(() => {
    plugin = new ThemePlugin();
  });

  it('has the correct id, name, and version', () => {
    expect(plugin.manifest.id).toBe('theme');
    expect(plugin.manifest.name).toBe('Theme');
    expect(plugin.manifest.version).toBe('1.0.0');
  });

  it('has no dependencies', () => {
    expect(plugin.manifest.dependencies).toBeUndefined();
  });
});

describe('ThemePlugin — activate() storage reads', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads theme preference from storage on activate', async () => {
    await harness.plugin.activate(harness.ctx);
    expect(harness.ctx.storage.get).toHaveBeenCalledWith('theme');
  });

  it('applies stored dark theme CSS class to documentElement', async () => {
    vi.mocked(harness.ctx.storage.get).mockResolvedValue({ id: 'dark', base: 'dark' });
    await harness.plugin.activate(harness.ctx);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('light');
  });

  it('applies stored light theme CSS class to documentElement', async () => {
    vi.mocked(harness.ctx.storage.get).mockResolvedValue({ id: 'light', base: 'light' });
    await harness.plugin.activate(harness.ctx);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('light');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });
});

describe('ThemePlugin — activate() fallbacks and tokens', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to system preference when no stored theme', async () => {
    vi.mocked(harness.ctx.storage.get).mockResolvedValue(undefined);
    harness.mockMediaQuery.matches = true;

    await harness.plugin.activate(harness.ctx);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('applies stored theme tokens as CSS custom properties on activate', async () => {
    vi.mocked(harness.ctx.storage.get).mockResolvedValue({
      id: 'midnight',
      base: 'dark',
      tokens: { '--color-bg': '#0d1117' },
    });

    await harness.plugin.activate(harness.ctx);

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-bg',
      '#0d1117',
    );
  });
});

describe('ThemePlugin — activate() UI registration', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a settings-section slot with ThemeSettingsPanel', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'settings-section',
      expect.objectContaining({ component: 'ThemeSettingsPanel' }),
    );
  });

  it('does NOT read theme from the host page', async () => {
    const querySelectorSpy = vi.spyOn(document, 'querySelector');
    await harness.plugin.activate(harness.ctx);

    const themeProbeAttempts = querySelectorSpy.mock.calls.filter(
      ([selector]) =>
        typeof selector === 'string' &&
        (selector.includes('data-theme') ||
          selector.includes('dark-theme') ||
          selector.includes('color-scheme')),
    );
    expect(themeProbeAttempts).toHaveLength(0);
  });
});

describe('ThemePlugin — activate() media query listener', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listens to system media query changes using addEventListener (not addListener)', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.mockMediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(harness.mockMediaQuery.addListener).not.toHaveBeenCalled();
  });

  it('switches base class when the media query change event fires', async () => {
    await harness.plugin.activate(harness.ctx);

    const [, listener] = vi.mocked(harness.mockMediaQuery.addEventListener).mock.calls[0] ?? [];
    expect(typeof listener).toBe('function');
    (listener as (event: MediaQueryListEvent) => void)({
      matches: true,
    } as MediaQueryListEvent);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('switches to light class when media query change event reports matches: false', async () => {
    await harness.plugin.activate(harness.ctx);

    const [, listener] = vi.mocked(harness.mockMediaQuery.addEventListener).mock.calls[0] ?? [];
    (listener as (event: MediaQueryListEvent) => void)({
      matches: false,
    } as MediaQueryListEvent);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('light');
  });
});

const MIDNIGHT_THEME = {
  id: 'midnight',
  name: 'Midnight',
  base: 'dark' as const,
  tokens: { '--color-bg': '#0d1117', '--color-text': '#e6edf3' },
  isCustom: false,
};

const DARK_THEME_NO_TOKENS = {
  id: 'dark',
  name: 'Dark',
  base: 'dark' as const,
  tokens: {},
  isCustom: false,
};

describe('ThemePlugin — onThemeChanged hook', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies new theme tokens as CSS custom properties', async () => {
    await harness.plugin.activate(harness.ctx);
    harness.ctx.hooks.onThemeChanged.call(MIDNIGHT_THEME);

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-bg',
      '#0d1117',
    );
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-text',
      '#e6edf3',
    );
  });

  it('updates CSS class when theme base changes via hook', async () => {
    await harness.plugin.activate(harness.ctx);
    harness.ctx.hooks.onThemeChanged.call(DARK_THEME_NO_TOKENS);

    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('light');
  });
});

describe('ThemePlugin — deactivate()', () => {
  let harness: ThemeTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes the media query event listener on deactivate', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.plugin.deactivate();

    expect(harness.mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('deactivate() resolves without error before activate()', async () => {
    await expect(harness.plugin.deactivate()).resolves.toBeUndefined();
  });
});
