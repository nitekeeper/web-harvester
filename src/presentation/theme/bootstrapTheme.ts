import { Container } from 'inversify';

import { createPluginStorage } from '@core/context';
import { createHookSystem } from '@core/hooks';
import { createUIRegistry } from '@core/ui-registry';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { ThemePlugin } from '@plugins/theme/ThemePlugin';
import { createLogger } from '@shared/logger';

/**
 * Activates ThemePlugin in a UI page context (popup, settings, side-panel).
 * Reads the stored theme preset, applies CSS custom properties and the
 * dark/light base class to `documentElement`, and wires the system
 * `prefers-color-scheme` media-query listener for reactive updates.
 *
 * Must be awaited before the React tree mounts to avoid a flash of unstyled
 * content. Errors are non-fatal — the caller should swallow them so a storage
 * failure never blocks the page from rendering.
 */
export async function bootstrapTheme(): Promise<void> {
  const adapter = new ChromeAdapter();
  const plugin = new ThemePlugin();
  await plugin.activate({
    hooks: createHookSystem(),
    container: new Container(),
    logger: createLogger('plugin:theme'),
    storage: createPluginStorage('theme', adapter),
    ui: createUIRegistry(),
  });
}
