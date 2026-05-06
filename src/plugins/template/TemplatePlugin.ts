// src/plugins/template/TemplatePlugin.ts
import type { CompileResult, ITemplateService } from '@application/TemplateService';
import { TYPES } from '@core/types';
import { extractArticleMarkdown } from '@domain/extractor/content-extractor';
import type { ClipContent, ILogger, IPlugin, IPluginContext, IPluginManifest } from '@domain/types';

/**
 * Extracts the article body from clip content, returning an empty string on
 * failure so a single extractor error never aborts the clip.
 */
async function extractBody(content: ClipContent, logger: ILogger): Promise<string> {
  try {
    return await extractArticleMarkdown(content.body, content.url);
  } catch (err) {
    logger.error('article extraction failed', err);
    return '';
  }
}

/**
 * Plugin that wires the user's active clip template into the `beforeClip`
 * waterfall, taps the `onTemplateRender` hook for downstream transformations,
 * and contributes UI affordances for selecting/managing templates.
 */
export class TemplatePlugin implements IPlugin {
  readonly manifest: IPluginManifest = {
    id: 'template',
    name: 'Template',
    version: '1.0.0',
    dependencies: ['clipper'],
  };

  private beforeClipUnsubscribe: (() => void) | null = null;
  private onTemplateRenderUnsubscribe: (() => void) | null = null;

  /**
   * Resolves `ITemplateService` from the container, registers the template
   * UI components, and taps the `beforeClip` and `onTemplateRender` hooks so
   * the active template is applied to clip content.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, ui, logger } = context;

    const templateService = container.get<ITemplateService>(TYPES.ITemplateService);

    ui.addToSlot('popup-properties', { component: 'TemplateSelector', order: 100 });
    ui.addToSlot('settings-section', { component: 'TemplateSettingsPanel', order: 20 });

    this.beforeClipUnsubscribe = hooks.beforeClip.tapAsync(
      async (content: ClipContent): Promise<ClipContent | undefined> => {
        const template = await templateService.getDefault();
        const markdownBody = await extractBody(content, logger);
        const variables = {
          content: markdownBody,
          title: content.title,
          url: content.url,
          date: new Date().toISOString().slice(0, 10),
          selectedText: content.selectedText,
        };
        const result: CompileResult = await templateService.render(template.id, variables);
        if (result.ok) {
          return { ...content, body: result.output };
        }
        return { ...content, body: markdownBody };
      },
    );

    this.onTemplateRenderUnsubscribe = hooks.onTemplateRender.tapAsync(
      async (rendered: string): Promise<string | undefined> => rendered,
    );

    logger.info('TemplatePlugin activated');
  }

  /** Unsubscribes both hook taps registered during `activate()`. */
  async deactivate(): Promise<void> {
    this.beforeClipUnsubscribe?.();
    this.onTemplateRenderUnsubscribe?.();
    this.beforeClipUnsubscribe = null;
    this.onTemplateRenderUnsubscribe = null;
  }
}
