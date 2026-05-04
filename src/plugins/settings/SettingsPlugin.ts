// src/plugins/settings/SettingsPlugin.ts
import type { PluginRegistry } from '@core/registry';
import { TYPES } from '@core/types';
import type { IPlugin, IPluginContext, IPluginManifest, Settings } from '@domain/types';

/**
 * Minimal port for the settings service. The plugin treats `set()` as a
 * full-object writer because the `onSettingsChanged` hook payload is the
 * complete `Settings` record. Defining the port locally avoids a cross-layer
 * dependency on the concrete `ISettingsService` interface (which exposes a
 * key/value `set<K extends keyof AppSettings>` signature) — see ADR-005 for
 * the rationale behind plugin-local ports.
 */
interface ISettingsServicePort {
  set(settings: Settings): Promise<void>;
}

/**
 * Plugin that contributes the general settings UI surface (navigation entry
 * and panel) plus a debug panel, and persists settings changes by tapping the
 * `onSettingsChanged` hook. Resolves `ISettingsService` and the
 * `PluginRegistry` from the DI container at activation time.
 */
export class SettingsPlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'settings',
    name: 'Settings',
    version: '1.0.0',
  };

  private settingsChangedUnsubscribe: (() => void) | null = null;

  /**
   * Resolves required services, registers the general settings nav and panel
   * (plus a debug panel ordered last), and taps `onSettingsChanged` to
   * persist incoming settings via `ISettingsService.set`.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, ui, logger } = context;

    const settingsService = container.get<ISettingsServicePort>(TYPES.ISettingsService);
    container.get<PluginRegistry>(TYPES.IPluginRegistry);

    ui.addToSlot('settings-nav', { component: 'GeneralSettingsNav', order: 0 });
    ui.addToSlot('settings-section', { component: 'GeneralSettingsPanel', order: 0 });
    ui.addToSlot('settings-section', { component: 'DebugPanel', order: 9999 });

    this.settingsChangedUnsubscribe = hooks.onSettingsChanged.tapAsync(
      async (settings: Settings): Promise<void> => {
        await settingsService.set(settings);
      },
    );

    logger.info('SettingsPlugin activated');
  }

  /** Unsubscribes the `onSettingsChanged` tap registered during activation. */
  async deactivate(): Promise<void> {
    this.settingsChangedUnsubscribe?.();
    this.settingsChangedUnsubscribe = null;
  }
}
