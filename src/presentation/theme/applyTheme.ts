/**
 * Applies the active theme base class to `document.documentElement`.
 * Mirrors the logic in `ThemePlugin.applyThemeBase` so the settings surface
 * can apply theme changes immediately without activating the full plugin.
 */
export function applyThemeToDocument(theme: 'light' | 'dark' | 'system'): void {
  const cl = document.documentElement.classList;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    cl.toggle('dark', prefersDark);
    cl.toggle('light', !prefersDark);
  } else {
    cl.toggle('dark', theme === 'dark');
    cl.toggle('light', theme === 'light');
  }
}
