// src/plugins/settings/SettingsPlugin.ts
import type { PluginRegistry } from '@core/registry';
import { TYPES } from '@core/types';
import type { IPlugin, IPluginContext, IPluginManifest, Settings } from '@domain/types';

/**
 * Minimal port for the settings service used by this plugin. Exposes only
 * `setAll` — the full-object writer called when `onSaveSettings` fires.
 * Defined locally to avoid a cross-layer dependency on the concrete
 * `ISettingsService` interface — see ADR-005 for the rationale.
 */
interface ISettingsServicePort {
  setAll(settings: Settings): Promise<void>;
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

  private onSaveSettingsUnsubscribe: (() => void) | null = null;

  /**
   * Resolves required services, registers the general settings nav and panel
   * (plus a debug panel ordered last), and taps `onSaveSettings` to persist
   * incoming settings via `ISettingsService.setAll`.
   *
   * Uses `onSaveSettings` (not `onSettingsChanged`) intentionally: tapping
   * `onSettingsChanged` would create an infinite loop because `setAll` fires
   * `onSettingsChanged` after persisting. `onSaveSettings` is a one-way write
   * request; `onSettingsChanged` is a post-write notification.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, ui, logger } = context;

    const settingsService = container.get<ISettingsServicePort>(TYPES.ISettingsService);
    container.get<PluginRegistry>(TYPES.IPluginRegistry);

    ui.addToSlot('settings-nav', { component: 'GeneralSettingsNav', order: 0 });
    ui.addToSlot('settings-section', { component: 'GeneralSettingsPanel', order: 0 });
    ui.addToSlot('settings-section', { component: 'DebugPanel', order: 9999 });

    this.onSaveSettingsUnsubscribe = hooks.onSaveSettings.tapAsync(
      async (settings: Settings): Promise<void> => {
        await settingsService.setAll(settings);
      },
    );

    logger.info('SettingsPlugin activated');
  }

  /** Unsubscribes the `onSaveSettings` tap registered during activation. */
  async deactivate(): Promise<void> {
    this.onSaveSettingsUnsubscribe?.();
    this.onSaveSettingsUnsubscribe = null;
  }
}
