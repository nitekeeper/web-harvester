// src/plugins/reader/ReaderPlugin.ts
import { TYPES } from '@core/types';
import type { IPlugin, IPluginContext, IPluginManifest } from '@domain/types';

/**
 * Minimal port for the reader-mode service. Mirrors the shape of
 * `IReaderService.toggle(tabId)` so the plugin can call it without depending
 * on the concrete infrastructure interface (the popup-toolbar `onClick` slot
 * resolves the active tab id at click time).
 */
interface IReaderServicePort {
  toggle(tabId: number): Promise<void>;
}

/**
 * Minimal port for the tab adapter — just enough to fetch the active tab so
 * the plugin can pass its id to `IReaderService.toggle()`.
 */
interface ITabAdapterPort {
  getActiveTab(): Promise<{ id?: number } | undefined>;
}

/**
 * Plugin that contributes a reader-mode toggle button to the popup toolbar.
 * The button delegates to `IReaderService` resolved from the DI container at
 * activation time; no hooks are tapped and no state is held across
 * `activate()`/`deactivate()`.
 */
export class ReaderPlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'reader',
    name: 'Reader',
    version: '1.0.0',
  };

  /**
   * Resolves `IReaderService` and `ITabAdapter`, registers `ReaderButton` in
   * the `popup-toolbar` slot with an `onClick` handler that fetches the
   * active tab and calls `readerService.toggle(tab.id)`, and logs activation.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, ui, logger } = context;

    const readerService = container.get<IReaderServicePort>(TYPES.IReaderService);
    const tabAdapter = container.get<ITabAdapterPort>(TYPES.ITabAdapter);

    ui.addToSlot('popup-toolbar', {
      component: 'ReaderButton',
      order: 200,
      onClick: async (): Promise<void> => {
        const tab = await tabAdapter.getActiveTab();
        if (tab?.id === undefined) return;
        await readerService.toggle(tab.id);
      },
    });

    logger.info('ReaderPlugin activated');
  }

  /** No-op — ReaderService lifecycle is managed by the DI container. */
  async deactivate(): Promise<void> {}
}
