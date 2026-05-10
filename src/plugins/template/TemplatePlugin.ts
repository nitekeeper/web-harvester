// src/plugins/template/TemplatePlugin.ts
import type { CompileResult, ITemplateService } from '@application/TemplateService';
import { TYPES } from '@core/types';
import { extractArticleMarkdown } from '@domain/extractor/content-extractor';
import { flattenSchemaOrg, scanForSelectors } from '@domain/template/dynamicVariables';
import type { ClipContent, ILogger, IPlugin, IPluginContext, IPluginManifest } from '@domain/types';
import type { MetaTag } from '@shared/types';

/** Minimal port used to send selector queries to the content script. */
interface ISelectorPort {
  sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>;
}

/**
 * Returns the article body as markdown. Uses `content.markdown` when the
 * content script has already extracted it (avoids DOMParser in the service
 * worker). Falls back to `extractArticleMarkdown` for backward compatibility.
 */
async function extractBody(content: ClipContent, logger: ILogger): Promise<string> {
  if (content.markdown) return content.markdown;
  try {
    return await extractArticleMarkdown(content.body, content.url);
  } catch (err) {
    logger.error('article extraction failed', err);
    return '';
  }
}

/**
 * Builds the template variable dictionary from clip content and the extracted
 * article markdown. Supplies all page, meta, and date variables that templates
 * can reference.
 */
function buildTemplateVariables(
  content: ClipContent,
  markdownBody: string,
): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  let domain = '';
  try {
    domain = new URL(content.url).hostname;
  } catch {
    // non-parseable URL — domain stays empty
  }
  const readingTime =
    content.wordCount && content.wordCount > 0 ? `${Math.ceil(content.wordCount / 200)} min` : '';
  return {
    content: markdownBody,
    title: content.title,
    url: content.url,
    date: today,
    today,
    today_iso: new Date().toISOString(),
    selectedText: content.selectedText,
    now: today,
    'page.title': content.title,
    'page.url': content.url,
    'page.domain': domain,
    description: content.description ?? '',
    author: content.author ?? '',
    published: content.published ?? '',
    tags: content.tags ?? '',
    'page.description': content.description ?? '',
    'page.published_date': content.published ?? '',
    'page.tags': content.tags ?? '',
    'page.reading_time': readingTime,
    'meta.author': content.author ?? '',
    'meta.description': content.description ?? '',
    'meta.image': content.image ?? '',
    'meta.site_name': content.site ?? '',
  };
}

/**
 * Iterates `allMetaTags` and writes `meta:name:*` / `meta:property:*` keys
 * into `variables`. Skips entries with null content.
 */
function addMetaTagVariables(
  allMetaTags: readonly MetaTag[],
  variables: Record<string, unknown>,
): void {
  for (const tag of allMetaTags) {
    if (tag.content === null) continue;
    if (tag.name) Reflect.set(variables, `meta:name:${tag.name}`, tag.content);
    if (tag.property) Reflect.set(variables, `meta:property:${tag.property}`, tag.content);
  }
}

/**
 * Flattens schema.org data into `schema:@Type:field` variable keys.
 * No-ops when `schemaOrgData` is empty or undefined.
 */
function addSchemaVariables(
  schemaOrgData: Record<string, unknown> | undefined,
  variables: Record<string, unknown>,
): void {
  if (!schemaOrgData) return;
  flattenSchemaOrg(schemaOrgData, variables);
}

/**
 * Merges resolved selector key/value pairs into the variables dictionary.
 * Returns early if the IPC response is absent or not a plain object.
 *
 * @param raw - Raw IPC response from the content script.
 * @param variables - Mutable variables dictionary to populate.
 */
function mergeResolvedSelectors(raw: unknown, variables: Record<string, unknown>): void {
  if (raw === null || raw === undefined || typeof raw !== 'object') return;
  const resolved = raw as Record<string, string>;
  for (const [k, v] of Object.entries(resolved)) {
    Reflect.set(variables, k, v);
  }
}

/**
 * Pre-scans the template source for `selector:` / `selectorHtml:` variables,
 * resolves them via a single IPC call to the content script, and merges the
 * results into `variables`. No-ops when `tabId` is absent or no selector
 * expressions are found. IPC errors are caught and treated as non-fatal so
 * that selector variables are simply absent rather than aborting the clip.
 */
async function resolveSelectorVariables(
  templateSource: string,
  tabId: number | undefined,
  tabAdapter: ISelectorPort | null,
  variables: Record<string, unknown>,
): Promise<void> {
  if (!tabId || !tabAdapter) return;
  const exprs = scanForSelectors(templateSource);
  if (exprs.length === 0) return;
  try {
    const raw = await tabAdapter.sendMessageToTab(tabId, {
      type: 'extractSelectors',
      selectors: exprs,
    });
    mergeResolvedSelectors(raw, variables);
  } catch {
    // IPC failure is non-fatal; selector variables will be absent
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
  private tabAdapter: ISelectorPort | null = null;

  /**
   * Resolves `ITemplateService` from the container, registers the template
   * UI components, and taps the `beforeClip` and `onTemplateRender` hooks so
   * the active template is applied to clip content.
   */
  async activate(context: IPluginContext): Promise<void> {
    const { container, hooks, ui, logger } = context;

    const templateService = container.get<ITemplateService>(TYPES.ITemplateService);
    this.tabAdapter = container.get<ISelectorPort>(TYPES.ITabAdapter);

    ui.addToSlot('popup-properties', { component: 'TemplateSelector', order: 100 });
    ui.addToSlot('settings-section', { component: 'TemplateSettingsPanel', order: 20 });

    this.beforeClipUnsubscribe = hooks.beforeClip.tapAsync(
      async (content: ClipContent): Promise<ClipContent | undefined> => {
        const template = content.selectedTemplateId
          ? ((await templateService.getById(content.selectedTemplateId)) ??
            (await templateService.getDefault()))
          : await templateService.getDefault();
        const markdownBody = await extractBody(content, logger);
        const variables = buildTemplateVariables(content, markdownBody);
        addMetaTagVariables(content.allMetaTags ?? [], variables);
        addSchemaVariables(content.schemaOrgData, variables);
        const templateSource = template.frontmatterTemplate + '\n' + template.bodyTemplate;
        await resolveSelectorVariables(templateSource, content.tabId, this.tabAdapter, variables);
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
  }

  /** Unsubscribes both hook taps registered during `activate()`. */
  async deactivate(): Promise<void> {
    this.beforeClipUnsubscribe?.();
    this.onTemplateRenderUnsubscribe?.();
    this.beforeClipUnsubscribe = null;
    this.onTemplateRenderUnsubscribe = null;
    this.tabAdapter = null;
  }
}
