// src/plugins/clipper/ClipperPlugin.ts
import { TYPES } from '@core/types';
import type { IPlugin, IPluginContext, IPluginManifest } from '@domain/types';

/** ClipperPlugin wires ITabAdapter, INotificationAdapter, and IClipService into the popup footer. */
export class ClipperPlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'clipper',
    name: 'Clipper',
    version: '1.0.0',
    // IClipService is an application-layer service, not an adapter — not listed in requiredAdapters
    // (which tracks only infrastructure adapter bindings). Its presence is validated at activate() time.
    requiredAdapters: [TYPES.ITabAdapter, TYPES.INotificationAdapter],
  };

  /** Resolves required adapters and the clip service, then registers the SaveButton in the popup footer. */
  async activate(context: IPluginContext): Promise<void> {
    const { container, ui, logger } = context;

    // Eager-validate that required bindings are registered; throws at activation time if missing.
    // IClipService is checked here too because it's an application-layer service (not an adapter)
    // and therefore not listed in manifest.requiredAdapters.
    container.get(TYPES.ITabAdapter);
    container.get(TYPES.INotificationAdapter);
    container.get(TYPES.IClipService);

    // Register the primary save action in the popup footer
    ui.addToSlot('popup-footer', { component: 'SaveButton', order: 100 });

    logger.info('ClipperPlugin activated');
  }

  /** No-op — ClipService lifecycle is managed by the DI container. */
  async deactivate(): Promise<void> {}
}
