// src/application/ClipService.ts

import { safe_name } from '@domain/filters/safe_name';
import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';

// ── Domain types (mirrored locally to keep application/ free of @core/ imports) ─

/**
 * Lightweight, framework-agnostic representation of a browser tab. Mirrors the
 * `Tab` shape exposed by `ITabAdapter` in the infrastructure layer; defined
 * locally so this service does not import from `@infrastructure/`.
 */
export interface Tab {
  readonly id: number;
  readonly url: string;
  readonly title: string;
}

/**
 * Content captured from a web page prior to clipping. Mirrors the `ClipContent`
 * payload defined in `@core/hooks` — replicated here because `application/`
 * cannot import from `core/`.
 */
export interface ClipContent {
  readonly url: string;
  readonly html: string;
  readonly title: string;
  /** Pre-extracted article markdown returned by the content script alongside the raw HTML. */
  readonly markdown?: string;
  /** ID of the template to apply during the clip/preview flow. When absent, the plugin falls back to the default template. */
  readonly selectedTemplateId?: string;
}

/**
 * Successful clip outcome — name of the saved file and label of the
 * destination it was written to. Mirrors the `ClipResult` payload in
 * `@core/hooks`.
 */
export interface ClipResult {
  readonly fileName: string;
  readonly destination: string;
}

/**
 * Outcome returned when a `beforeSave` hook short-circuits the save by
 * returning `false`. Allows callers to distinguish a deliberate abort from a
 * successful clip without throwing.
 */
export interface ClipAborted {
  readonly aborted: true;
  readonly reason: string;
}

/**
 * Request payload for a save operation, passed to `beforeSave` hooks so
 * plugins can inspect (and bail on) the pending write. Mirrors `SaveRequest`
 * in `@core/hooks`.
 */
export interface SaveRequest {
  readonly content: string;
  readonly fileName: string;
  readonly destinationId: string;
}

/**
 * Result emitted to `afterSave` hooks once a save completes. Mirrors
 * `SaveResult` in `@core/hooks`.
 */
export interface SaveResult {
  readonly filePath: string;
}

/**
 * Persisted destination folder selected by the user. Mirrors the `Destination`
 * shape from `@infrastructure/storage/destinations`; defined locally so this
 * service stays within the application layer's allowed import surface.
 */
export interface Destination {
  readonly id: string;
  readonly label: string;
  readonly dirHandle: FileSystemDirectoryHandle;
  readonly fileNamePattern: string;
  readonly createdAt: number;
  /** Unix milliseconds of the most recent clip saved to this destination. */
  readonly lastUsed?: number;
}

// ── Notification payload ──────────────────────────────────────────────────────

/**
 * Notification payload accepted by the local `INotificationAdapterPort`. The
 * application layer uses a richer object than the bare
 * `(id, msg)`-style infrastructure adapter so callers can express intent
 * (`type`) without overloading the message string.
 */
export interface NotificationPayload {
  readonly type: 'success' | 'error' | 'info';
  readonly title: string;
  readonly message: string;
}

// ── Port interfaces (subset used by this service) ─────────────────────────────

/**
 * Minimal browser tab port required by `ClipService`. Mirrors the relevant
 * slice of `ITabAdapter` from the infrastructure layer; defined locally so
 * this service can stay within the application layer's import boundaries.
 */
export interface ITabAdapterPort {
  getActiveTab(): Promise<Tab>;
  /** Sends a message to the content script running in the given tab. */
  sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>;
}

/**
 * Minimal destination storage port required by `ClipService`. Mirrors the
 * subset of `IDestinationStorage` that the clip flow uses.
 */
export interface IDestinationStoragePort {
  /** Returns a destination by id, or `undefined` if no such id exists. */
  getById(id: string): Promise<Destination | undefined>;
  /** Stamps a field on an existing destination. Silent no-op for unknown ids. */
  update(id: string, changes: { lastUsed: number }): Promise<void>;
}

/**
 * Notification port used by `ClipService` to surface clip outcomes to the
 * user. Defined locally — the infrastructure `INotificationAdapter` accepts
 * `(id, message)` strings, while this application port accepts a structured
 * payload so the service can express intent without parsing strings.
 */
export interface INotificationAdapterPort {
  showNotification(payload: NotificationPayload): Promise<void>;
}

/**
 * Local hook port describing the four hooks emitted during the clip flow.
 * Mirrors the relevant slice of `IHookSystem` in `@core/hooks` — defined here
 * because `application/` cannot import from `core/`, and the placeholder
 * `IHookSystem` in `@domain/types` exposes hooks only as `unknown`.
 */
export interface IClipHooksPort {
  readonly beforeClip: { call(value: ClipContent): Promise<ClipContent> };
  readonly afterClip: { call(value: ClipResult): Promise<void> };
  readonly beforeSave: { call(value: SaveRequest): Promise<boolean> };
  readonly afterSave: { call(value: SaveResult): Promise<void> };
}

/**
 * Function type matching `saveTo` from `@infrastructure/fsa`. Injected as a
 * constructor parameter so the service stays within the application layer's
 * allowed import surface and remains trivially mockable in tests.
 */
export type SaveToFn = (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
  strategy: string,
) => Promise<string>;

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Request payload accepted by `IClipService.clip()`. Identifies the tab to
 * extract content from and the destination to save the result into.
 */
export interface ClipRequest {
  readonly tabId: number;
  readonly destinationId: string;
  /** Reserved for Task 33 (template selection) and XPath scoping; not yet consumed by clip(). */
  readonly templateId?: string;
  /** Reserved for Task 33 (template selection) and XPath scoping; not yet consumed by clip(). */
  readonly excludedXPaths?: string[];
  /** Reserved for Task 33 (template selection) and XPath scoping; not yet consumed by clip(). */
  readonly includedXPaths?: string[];
  /** When supplied (from live preview), skip extraction and beforeClip. */
  readonly previewMarkdown?: string;
}

/**
 * Public surface of the clip orchestration service. A successful call returns
 * a `ClipResult`; a `beforeSave` hook returning `false` resolves to a
 * `ClipAborted` value so callers can distinguish abort from success without
 * catching exceptions.
 */
export interface IClipService {
  /**
   * Orchestrates the full clip flow: extract content from the active tab, run
   * `beforeClip`/`beforeSave` hooks, persist via the injected `saveTo`
   * function, then fire `afterSave` and surface a user-facing notification.
   */
  clip(request: ClipRequest): Promise<ClipResult | ClipAborted>;

  /**
   * Extracts the current page and runs the `beforeClip` waterfall without
   * persisting anything. Returns the compiled markdown string for display in
   * the popup's PROPERTIES and PREVIEW sections.
   *
   * @param templateId - ID of the template to compile the preview with. When omitted the plugin falls back to the default template.
   */
  preview(templateId?: string): Promise<string>;
}

// ── Errors ────────────────────────────────────────────────────────────────────

/**
 * Thrown when `clip()` is called with a `destinationId` that does not match
 * any persisted destination.
 */
export class DestinationNotFoundError extends Error {
  /**
   * @param destinationId - The id that was looked up but not found.
   */
  constructor(destinationId: string) {
    super(`Destination "${destinationId}" was not found`);
    this.name = 'DestinationNotFoundError';
  }
}

// ── Implementation ────────────────────────────────────────────────────────────

const DEFAULT_CONFLICT_STRATEGY = 'suffix';

/**
 * Resolves the destination's `fileNamePattern` by substituting the supported
 * placeholders (`{date}`, `{title}`). Unsupported placeholders are left in
 * place so plugins or callers can post-process the name if needed. Title
 * sanitization is delegated to the `safe_name` domain filter, which strips
 * special chars (`#|^[]`), control characters, and Windows-reserved
 * names.
 */
function resolveFileName(pattern: string, content: ClipContent): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = safe_name(content.title);
  return pattern.replace('{date}', date).replace('{title}', safeTitle);
}

/**
 * Application service that orchestrates the end-to-end clip flow: tab
 * inspection, hook fan-out, persistence via an injected `saveTo` function, and
 * a user-facing notification on success. Stays within the application layer's
 * import boundaries by accepting all infrastructure dependencies through
 * locally-defined port interfaces.
 */
export class ClipService implements IClipService {
  /**
   * @param tabAdapter - Tab port used to read the active tab and request HTML from the content script.
   * @param destinationStorage - Destination port used to resolve the target directory by id.
   * @param hooks - Hook port exposing the four clip-flow hooks.
   * @param notifications - Notification port used to surface success outcomes.
   * @param saveTo - Persistence function (matches `@infrastructure/fsa.saveTo`).
   * @param logger - Scoped logger; defaults to a `ClipService`-scoped logger.
   */
  constructor(
    private readonly tabAdapter: ITabAdapterPort,
    private readonly destinationStorage: IDestinationStoragePort,
    private readonly hooks: IClipHooksPort,
    private readonly notifications: INotificationAdapterPort,
    private readonly saveTo: SaveToFn,
    private readonly logger: ILogger = createLogger('ClipService'),
  ) {}

  /**
   * Executes the clip flow for the given request. Steps:
   *   1. Read the active tab (URL + title).
   *   2. If `previewMarkdown` is supplied, use it directly (skips extraction + beforeClip).
   *      Otherwise: ask the content script for the page HTML, run `beforeClip`.
   *   3. Resolve the destination — throws `DestinationNotFoundError` if missing.
   *   4. Render the destination's filename pattern.
   *   5. Run `beforeSave` — bails with a `ClipAborted` value if any tap returns false.
   *   6. Persist via the injected `saveTo` function.
   *   7. Fire `afterClip` and `afterSave`, then show a success notification.
   */
  async clip(request: ClipRequest): Promise<ClipResult | ClipAborted> {
    const tab = await this.tabAdapter.getActiveTab();
    const content = await this.resolveContent(request, tab);

    const destination = await this.destinationStorage.getById(request.destinationId);
    if (!destination) {
      throw new DestinationNotFoundError(request.destinationId);
    }

    const fileName = resolveFileName(destination.fileNamePattern, content);

    const saveRequest: SaveRequest = {
      content: content.html,
      fileName,
      destinationId: destination.id,
    };
    const proceed = await this.hooks.beforeSave.call(saveRequest);
    if (!proceed) {
      this.logger.info(`Clip aborted by beforeSave hook for "${fileName}"`);
      return { aborted: true, reason: 'beforeSave hook returned false' };
    }

    const savedName = await this.saveTo(
      destination.dirHandle,
      fileName,
      content.html,
      DEFAULT_CONFLICT_STRATEGY,
    );

    const result: ClipResult = { fileName: savedName, destination: destination.label };
    this.destinationStorage
      .update(destination.id, { lastUsed: Date.now() })
      .catch((err: unknown) => this.logger.warn('lastUsed stamp failed', err));
    await this.hooks.afterClip.call(result);
    await this.hooks.afterSave.call({ filePath: `${destination.label}/${savedName}` });
    this.notifySuccess(savedName, destination.label);

    this.logger.info(`Clip saved: ${savedName} → ${destination.label}`);
    return result;
  }

  /**
   * Builds the `ClipContent` for a clip request. When `previewMarkdown` is
   * present, returns it directly (skipping extraction and the `beforeClip`
   * hook). Otherwise extracts the page HTML via the content script and runs
   * the `beforeClip` waterfall.
   */
  private async resolveContent(request: ClipRequest, tab: Tab): Promise<ClipContent> {
    if (request.previewMarkdown !== undefined && request.previewMarkdown !== '') {
      return { url: tab.url, html: request.previewMarkdown, title: tab.title };
    }
    const { html, markdown } = await this.extractPageContent(tab.id);
    const initialContent: ClipContent = { url: tab.url, html, title: tab.title, markdown };
    return this.hooks.beforeClip.call(initialContent);
  }

  /**
   * Extracts the current page and runs the `beforeClip` waterfall without
   * persisting anything. Returns the compiled markdown string for display in
   * the popup's PROPERTIES and PREVIEW sections. (Note: the field is named 'html'
   * for historical reasons — after beforeClip it holds the compiled markdown output.)
   */
  async preview(templateId?: string): Promise<string> {
    try {
      const tab = await this.tabAdapter.getActiveTab();
      const { html, markdown } = await this.extractPageContent(tab.id);
      const initialContent: ClipContent = {
        url: tab.url,
        html,
        title: tab.title,
        markdown,
        selectedTemplateId: templateId,
      };
      const content = await this.hooks.beforeClip.call(initialContent);
      return content.html;
    } catch (err: unknown) {
      this.logger.warn('preview failed — returning empty string', err);
      return '';
    }
  }

  /** Fire-and-forget success notification — failure must not surface as a clip error. */
  private notifySuccess(fileName: string, destinationLabel: string): void {
    this.notifications
      .showNotification({
        type: 'success',
        title: 'Clip saved',
        message: `Saved "${fileName}" to ${destinationLabel}`,
      })
      .catch((err: unknown) => {
        this.logger.error('notification failed', err);
      });
  }

  /**
   * Asks the content script for the page's outer HTML and pre-extracted article
   * markdown by sending a `getHtml` message. Falls back to empty strings when
   * the page is not scriptable (e.g. `chrome://` pages) so the rest of the
   * clip flow can still proceed — `beforeClip` hooks may substitute richer
   * content.
   */
  private async extractPageContent(tabId: number): Promise<{ html: string; markdown: string }> {
    try {
      const response = (await this.tabAdapter.sendMessageToTab(tabId, { type: 'getHtml' })) as
        | { html?: string; markdown?: string }
        | null
        | undefined;
      return { html: response?.html ?? '', markdown: response?.markdown ?? '' };
    } catch (err: unknown) {
      this.logger.warn('Page not scriptable — using empty content', err);
      return { html: '', markdown: '' };
    }
  }
}
