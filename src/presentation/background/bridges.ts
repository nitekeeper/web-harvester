// src/presentation/background/bridges.ts
//
// Bridge/adapter helpers used by the background composition root. These
// functions translate between application-layer ports and the concrete core
// hook system, infrastructure adapters, and domain compiler. Extracted from
// `background.ts` so that file stays under the 400-line limit. See ADR-020
// for the rationale behind the cross-layer imports.

import { type ClipContent as AppClipContent, type IClipHooksPort } from '@application/ClipService';
import { type Highlight, type IHighlightHooksPort } from '@application/HighlightService';
import {
  TemplateService,
  type CompileResult as ServiceCompileResult,
  type ITemplateService,
  type TemplateVariables,
} from '@application/TemplateService';
import { type CoreHookSystem } from '@core/hooks';
import { compileTemplate } from '@domain/template';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { ConflictStrategy, saveTo } from '@infrastructure/fsa/fsa';
import type { TemplateConfig } from '@shared/types';

/**
 * Adapts the domain `compileTemplate` (which returns `{ frontmatter, body,
 * errors }`) to the `CompileTemplateFn` shape expected by `TemplateService`
 * (`{ ok, output, errors }`). The adapter joins frontmatter and body back
 * into a single string and reports `ok` based on the absence of errors.
 *
 * `TemplateVariables` from the application layer is `Record<string,
 * unknown>`, while the domain compiler accepts a stricter
 * `Record<string, string | undefined>` shape. We coerce by converting any
 * non-string values via `String(...)` so the compiler always sees strings.
 */
export async function compileTemplateForService(
  template: string,
  variables: TemplateVariables,
): Promise<ServiceCompileResult> {
  const stringified: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(variables)) {
    Reflect.set(stringified, key, value === undefined ? undefined : String(value));
  }
  const result = await compileTemplate(
    template,
    stringified as Parameters<typeof compileTemplate>[1],
  );
  // The domain `splitFrontmatter` strips the surrounding `---` fences from
  // `result.frontmatter`. Restore them here so consumers (Obsidian) can parse
  // the YAML block as properties.
  const output =
    result.frontmatter.length > 0
      ? `---\n${result.frontmatter}\n---\n\n${result.body}`
      : result.body;
  return { ok: result.errors.length === 0, output, errors: result.errors };
}

/**
 * Adapter for `saveTo` whose `strategy` parameter is the application-layer
 * string shape (`'overwrite' | 'skip' | 'suffix'`). Maps the string to the
 * infrastructure `ConflictStrategy` enum and delegates to the real `saveTo`.
 */
export async function saveToWithStringStrategy(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
  strategy: string,
): Promise<string> {
  return saveTo(dirHandle, fileName, content, mapStrategy(strategy));
}

/** Maps a string strategy literal to the infrastructure `ConflictStrategy` enum. */
export function mapStrategy(strategy: string): ConflictStrategy {
  if (strategy === 'overwrite') return ConflictStrategy.Overwrite;
  if (strategy === 'skip') return ConflictStrategy.Skip;
  return ConflictStrategy.Suffix;
}

/**
 * Bridges the application-layer `IClipHooksPort` (which uses the application
 * `ClipContent` shape `{ url, html, title }`) to the core `CoreHookSystem`
 * (which uses the domain `ClipContent` shape `{ title, url, body,
 * selectedText, highlights? }`). The `html` field is mapped to the domain
 * `body`; `selectedText` defaults to an empty string until the content
 * extractor surfaces it.
 */
export function buildClipHooksPort(hooks: CoreHookSystem): IClipHooksPort {
  return {
    beforeClip: {
      async call(value: AppClipContent): Promise<AppClipContent> {
        const transformed = await hooks.beforeClip.call({
          title: value.title,
          url: value.url,
          body: value.html,
          selectedText: '',
          markdown: value.markdown,
          selectedTemplateId: value.selectedTemplateId,
          description: value.description,
          author: value.author,
          published: value.published,
          tags: value.tags,
          image: value.image,
          site: value.site,
          wordCount: value.wordCount,
        });
        return {
          url: transformed.url,
          html: transformed.body,
          title: transformed.title,
          markdown: transformed.markdown,
        };
      },
    },
    afterClip: hooks.afterClip,
    beforeSave: { call: (request) => hooks.beforeSave.call(request) },
    afterSave: hooks.afterSave,
  };
}

/**
 * Bridges the application-layer `IHighlightHooksPort` (which emits the
 * full `Highlight` record including `createdAt`) to the core
 * `onHighlight` event hook (whose payload is `HighlightEvent`, a subset
 * without `createdAt`). The bridge drops `createdAt` when fanning out and
 * forwards `tap` registrations to the underlying core hook.
 */
export function buildHighlightHooksPort(
  hooks: CoreHookSystem,
): Pick<IHighlightHooksPort, 'onHighlight'> {
  return {
    onHighlight: {
      tap(name: string, fn: (h: Highlight) => void): void {
        hooks.onHighlight.tap(name, async (event) => {
          fn({ ...event, createdAt: Date.now() });
        });
      },
      async call(h: Highlight): Promise<void> {
        await hooks.onHighlight.call({
          id: h.id,
          url: h.url,
          text: h.text,
          xpath: h.xpath,
          color: h.color,
        });
      },
    },
  };
}

/**
 * Adapter that bridges the application-layer `INotificationAdapterPort`
 * (which accepts a structured payload) to the infrastructure adapter's
 * `(id, message)` shape. The notification id is composed of the payload type
 * and a timestamp so concurrent notifications never collide.
 */
export function buildNotificationsPort(adapter: ChromeAdapter): {
  showNotification(payload: {
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }): Promise<void>;
} {
  return {
    async showNotification(payload): Promise<void> {
      // payload.title dropped: INotificationAdapter.showNotification only takes (id, msg)
      adapter.showNotification(`${payload.type}-${Date.now().toString()}`, payload.message);
    },
  };
}

/** Storage key under which the persisted template map is stored. */
export const TEMPLATES_KEY = 'templates';

/** Reads the persisted template map keyed by template id. */
export async function readTemplateMap(
  adapter: ChromeAdapter,
): Promise<Record<string, TemplateConfig>> {
  const raw = await adapter.getLocal(TEMPLATES_KEY);
  return (raw ?? {}) as Record<string, TemplateConfig>;
}

/**
 * Builds a `TemplateService` whose backing storage persists templates under
 * the `templates` key as a `Record<id, TemplateConfig>` in the underlying
 * `IStorageAdapter`. Mutations read-modify-write the map back to storage so
 * the `getAll`/`get` callers always see the latest state.
 */
export function buildTemplateService(
  adapter: ChromeAdapter,
  hooks: CoreHookSystem,
): ITemplateService {
  const storage = {
    async get(key: string): Promise<TemplateConfig | undefined> {
      const all = await readTemplateMap(adapter);
      return Object.prototype.hasOwnProperty.call(all, key)
        ? (Reflect.get(all, key) as TemplateConfig)
        : undefined;
    },
    async getAll(): Promise<TemplateConfig[]> {
      const all = await readTemplateMap(adapter);
      return Object.values(all);
    },
    async set(key: string, value: TemplateConfig): Promise<void> {
      const all = await readTemplateMap(adapter);
      Reflect.set(all, key, value);
      await adapter.setLocal(TEMPLATES_KEY, all);
    },
    async remove(key: string): Promise<void> {
      const all = await readTemplateMap(adapter);
      Reflect.deleteProperty(all, key);
      await adapter.setLocal(TEMPLATES_KEY, all);
    },
  };
  return new TemplateService(storage, hooks, compileTemplateForService);
}
