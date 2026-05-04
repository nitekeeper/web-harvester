import type { IPlugin, IPluginContext, IPluginManifest, ThemePreset } from '@domain/types';

/** Applies the given theme tokens as CSS custom properties on the document root. */
function applyThemeTokens(tokens: Record<string, string>): void {
  for (const [key, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(key, value);
  }
}

/** Toggles 'dark'/'light' class on documentElement. */
function applyThemeBase(base: 'light' | 'dark'): void {
  if (base === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Plugin that manages the active theme preference, applies CSS custom-property
 * tokens, watches the system `prefers-color-scheme` media query for changes,
 * and contributes a settings panel for user-facing configuration.
 */
export class ThemePlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'theme',
    name: 'Theme',
    version: '1.0.0',
  };

  private mediaQuery: MediaQueryList | null = null;
  private mediaChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private themeChangedUnsubscribe: (() => void) | null = null;

  /** Reads stored theme, applies it (or falls back to system preference), and wires hooks. */
  async activate(context: IPluginContext): Promise<void> {
    const { hooks, storage, ui, logger } = context;

    ui.addToSlot('settings-section', { component: 'ThemeSettingsPanel', order: 10 });

    const stored = await storage.get<ThemePreset>('theme');

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (stored) {
      logger.debug('Applying stored theme', { id: stored.id });
      applyThemeBase(stored.base);
      if (stored.tokens && Object.keys(stored.tokens).length > 0) {
        applyThemeTokens(stored.tokens);
      }
    } else {
      const prefersDark = this.mediaQuery.matches;
      logger.debug('No stored theme — using system preference', { prefersDark });
      applyThemeBase(prefersDark ? 'dark' : 'light');
    }

    this.mediaChangeHandler = (event: MediaQueryListEvent) => {
      applyThemeBase(event.matches ? 'dark' : 'light');
    };
    this.mediaQuery.addEventListener('change', this.mediaChangeHandler);

    this.themeChangedUnsubscribe = hooks.onThemeChanged.tap((preset: ThemePreset) => {
      applyThemeBase(preset.base);
      applyThemeTokens(preset.tokens);
    });
  }

  /** Removes the system media query listener and unsubscribes hook taps. */
  async deactivate(): Promise<void> {
    if (this.mediaQuery && this.mediaChangeHandler) {
      this.mediaQuery.removeEventListener('change', this.mediaChangeHandler);
    }
    this.themeChangedUnsubscribe?.();
    this.mediaQuery = null;
    this.mediaChangeHandler = null;
    this.themeChangedUnsubscribe = null;
  }
}
