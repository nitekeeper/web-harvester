// src/plugins/template/TemplatePlugin.ts
import type { CompileResult, ITemplateService } from '@application/TemplateService';
import { TYPES } from '@core/types';
import { turndownHtml } from '@domain/extractor/content-extractor';
import type { ClipContent, IPlugin, IPluginContext, IPluginManifest } from '@domain/types';

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
        const variables = {
          content: turndownHtml(content.body),
          title: content.title,
          url: content.url,
          date: new Date().toISOString().slice(0, 10),
          selectedText: content.selectedText,
        };
        const result: CompileResult = await templateService.render(template.id, variables);
        if (result.ok) {
          return { ...content, body: result.output };
        }
        return content;
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
