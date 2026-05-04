// src/plugins/highlighter/HighlighterPlugin.ts
import type { IHighlightService } from '@application/HighlightService';
import { TYPES } from '@core/types';
import type {
  ClipContent,
  HighlightEvent,
  IPlugin,
  IPluginContext,
  IPluginManifest,
} from '@domain/types';

/**
 * Plugin that injects persisted highlights into the `beforeClip` waterfall and
 * persists new highlight events emitted on the `onHighlight` event hook. Also
 * contributes a `HighlighterButton` UI affordance to the popup toolbar.
 */
export class HighlighterPlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'highlighter',
    name: 'Highlighter',
    version: '1.0.0',
    dependencies: ['clipper'],
  };

  private beforeClipUnsubscribe: (() => void) | null = null;
  private onHighlightUnsubscribe: (() => void) | null = null;

  /**
   * Resolves `IHighlightService` from the container, registers the highlighter
   * UI affordance, and taps the `beforeClip` and `onHighlight` hooks so
   * persisted highlights flow into clipped content and new highlight events
   * are persisted.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, ui, logger } = context;

    const highlightService = container.get<IHighlightService>(TYPES.IHighlightService);

    ui.addToSlot('popup-toolbar', { component: 'HighlighterButton', order: 100 });

    this.beforeClipUnsubscribe = hooks.beforeClip.tapAsync(
      async (content: ClipContent): Promise<ClipContent | undefined> => {
        const highlights = await highlightService.getHighlightsForUrl(content.url);
        if (highlights.length === 0) {
          return content;
        }
        const joined = highlights.map((h) => h.text).join('\n');
        return { ...content, highlights: joined };
      },
    );

    this.onHighlightUnsubscribe = hooks.onHighlight.tapAsync(
      async (event: HighlightEvent): Promise<void> => {
        await highlightService.addHighlight(event.url, event.text, event.xpath, event.color);
      },
    );

    logger.info('HighlighterPlugin activated');
  }

  /** Unsubscribes both hook taps registered during `activate()`. */
  async deactivate(): Promise<void> {
    this.beforeClipUnsubscribe?.();
    this.onHighlightUnsubscribe?.();
    this.beforeClipUnsubscribe = null;
    this.onHighlightUnsubscribe = null;
  }
}
