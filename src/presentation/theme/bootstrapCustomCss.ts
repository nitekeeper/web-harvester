// src/presentation/theme/bootstrapCustomCss.ts

import { useSettingsStore } from '@presentation/stores/useSettingsStore';

/** Creates or returns the `<style id="wh-custom-css">` element in document head. */
function getOrCreateStyleEl(): HTMLStyleElement {
  const existing = document.getElementById('wh-custom-css');
  if (existing instanceof HTMLStyleElement) return existing;
  const el = document.createElement('style');
  el.id = 'wh-custom-css';
  document.head.appendChild(el);
  return el;
}

/** Sets the style element content — non-empty only when theme is 'custom'. */
function syncStyleEl(theme: string, customCss: string): void {
  getOrCreateStyleEl().textContent = theme === 'custom' ? customCss : '';
}

/**
 * Reads the initial custom CSS state from the settings store, applies it if
 * the theme is 'custom', then subscribes to store changes to keep the
 * `<style id="wh-custom-css">` element live across all Web Harvestor surfaces.
 *
 * Call this once per surface after `bootstrapStore` completes, before mounting
 * the React tree. Returns the Zustand unsubscribe function.
 */
export function bootstrapCustomCss(): () => void {
  const { settings } = useSettingsStore.getState();
  syncStyleEl(settings.theme, settings.customCss);

  let prevTheme = settings.theme;
  let prevCss = settings.customCss;

  return useSettingsStore.subscribe((state) => {
    const { theme, customCss } = state.settings;
    if (theme === prevTheme && customCss === prevCss) return;
    prevTheme = theme;
    prevCss = customCss;
    syncStyleEl(theme, customCss);
  });
}
