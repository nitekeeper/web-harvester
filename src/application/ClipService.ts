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
  /** Runs {@link fn} in the context of the given tab and returns its return value. */
  evaluateOnTab<T>(tabId: number, fn: () => T): Promise<T>;
}

/**
 * Minimal destination storage port required by `ClipService`. Mirrors the
 * subset of `IDestinationStorage` that the clip flow uses (`getById`).
 */
export interface IDestinationStoragePort {
  getById(id: string): Promise<Destination | undefined>;
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
   *   2. Ask the content script for the page HTML.
   *   3. Run `beforeClip` so plugins can transform the content.
   *   4. Resolve the destination — throws `DestinationNotFoundError` if missing.
   *   5. Render the destination's filename pattern.
   *   6. Run `beforeSave` — bails with a `ClipAborted` value if any tap returns false.
   *   7. Persist via the injected `saveTo` function.
   *   8. Fire `afterClip` and `afterSave`, then show a success notification.
   */
  async clip(request: ClipRequest): Promise<ClipResult | ClipAborted> {
    const tab = await this.tabAdapter.getActiveTab();
    const html = await this.extractHtml(tab.id);

    const initialContent: ClipContent = { url: tab.url, html, title: tab.title };
    const content = await this.hooks.beforeClip.call(initialContent);

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
    await this.hooks.afterClip.call(result);
    await this.hooks.afterSave.call({ filePath: `${destination.label}/${savedName}` });
    this.notifySuccess(savedName, destination.label);

    this.logger.info(`Clip saved: ${savedName} → ${destination.label}`);
    return result;
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
   * Extracts the full outer HTML of the active tab by evaluating a function
   * directly in the tab's context via `chrome.scripting.executeScript`. Falls
   * back to an empty string if the tab is not scriptable (e.g. `chrome://`
   * pages or tabs opened before the extension was installed) so the rest of
   * the clip flow can still proceed — `beforeClip` hooks may substitute
   * richer content.
   */
  private async extractHtml(tabId: number): Promise<string> {
    try {
      return await this.tabAdapter.evaluateOnTab(tabId, () => document.body.innerHTML);
    } catch (err: unknown) {
      this.logger.warn('Page not scriptable — using empty string', err);
      return '';
    }
  }
}
