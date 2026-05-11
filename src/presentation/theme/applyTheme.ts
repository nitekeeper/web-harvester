/**
 * Applies the active theme base class to `document.documentElement`.
 * Mirrors the logic in `ThemePlugin.applyThemeBase` so the settings surface
 * can apply theme changes immediately without activating the full plugin.
 * The 'custom' theme uses Dark as its base palette.
 */
export function applyThemeToDocument(theme: 'light' | 'dark' | 'system' | 'custom'): void {
  const base = theme === 'custom' ? 'dark' : theme;
  const cl = document.documentElement.classList;
  if (base === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    cl.toggle('dark', prefersDark);
    cl.toggle('light', !prefersDark);
  } else {
    cl.toggle('dark', base === 'dark');
    cl.toggle('light', base === 'light');
  }
}
