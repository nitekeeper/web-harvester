// src/plugins/highlighter/HighlighterPlugin.ts
import type { IHighlightService } from '@application/HighlightService';
import { TYPES } from '@core/types';
import type { ClipContent, IPlugin, IPluginContext, IPluginManifest } from '@domain/types';

/**
 * Plugin that injects persisted highlights into the `beforeClip` waterfall at
 * clip time.
 */
export class HighlighterPlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'highlighter',
    name: 'Highlighter',
    version: '1.0.0',
    dependencies: ['clipper'],
  };

  private beforeClipUnsubscribe: (() => void) | null = null;

  /**
   * Resolves `IHighlightService` from the container and taps the `beforeClip`
   * hook to inject persisted highlights into clipped content.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, logger } = context;

    const highlightService = container.get<IHighlightService>(TYPES.IHighlightService);

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

    logger.info('HighlighterPlugin activated');
  }

  /** Unsubscribes the `beforeClip` tap registered during `activate()`. */
  async deactivate(): Promise<void> {
    this.beforeClipUnsubscribe?.();
    this.beforeClipUnsubscribe = null;
  }
}
