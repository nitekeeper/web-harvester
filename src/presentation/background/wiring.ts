// src/presentation/background/wiring.ts
//
// Lifecycle event-wiring helpers used by the background composition root.
// These connect the `ChromeAdapter` event sources (install, context menu,
// keyboard commands) to the application-layer `ClipService`. Extracted from
// `background.ts` so that file stays under the 400-line limit. See ADR-020
// for the rationale behind the cross-layer imports.

import { type IClipService } from '@application/ClipService';
import type { IReaderService } from '@application/ReaderService';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import type {
  ContextMenuInfo,
  IContextMenuAdapter,
} from '@infrastructure/adapters/interfaces/IContextMenuAdapter';
import type { IRuntimeAdapter } from '@infrastructure/adapters/interfaces/IRuntimeAdapter';
import type { ITabAdapter } from '@infrastructure/adapters/interfaces/ITabAdapter';
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { createLogger } from '@shared/logger';
import {
  isClipPageMessage,
  isPreviewPageMessage,
  isToggleReaderMessage,
  type ClipPageMessage,
  type PreviewPageMessage,
  type PreviewPageResponse,
  type ToggleReaderMessage,
} from '@shared/messages';
import { normalizeError } from '@shared/normalizeError';

const logger = createLogger('background');

/**
 * Wires the `onInstalled` event so the extension runs settings migrations
 * the first time it is installed and after every browser update.
 */
export function wireOnInstalled(
  adapter: ChromeAdapter,
  settingsStorage: ReturnType<typeof createSettingsStorage>,
): void {
  adapter.onInstalled((reason) => {
    settingsStorage
      .runMigrations([])
      .then(() => {
        logger.info('Settings migrations complete', { reason });
      })
      .catch((err: unknown) => {
        logger.error('Settings migrations failed', err);
      });
  });
}

/**
 * Registers the two top-level context-menu items and dispatches click events
 * to the clip service. Strings are hardcoded here per the ESLint rule that
 * bans `chrome.i18n.getMessage` outside `ChromeAdapter.ts`; once `formatjs`
 * lands these will move to message catalogs.
 */
export async function wireContextMenus(
  adapter: IContextMenuAdapter & ITabAdapter,
  clipService: IClipService,
): Promise<void> {
  await adapter.removeAllContextMenus();
  adapter.createContextMenu({ id: 'clip-page', title: 'Clip page', contexts: ['page'] });
  adapter.createContextMenu({
    id: 'clip-selection',
    title: 'Clip selection',
    contexts: ['selection'],
  });
  adapter.onContextMenuClick((info: ContextMenuInfo) => {
    handleContextMenuClick(info, adapter, clipService).catch((err: unknown) => {
      logger.error('Context menu click handler failed', err);
    });
  });
}

/**
 * Dispatches a context-menu click to the clip service, resolving the active
 * tab id and the user's default destination from settings before invoking
 * `clip()`. Errors are caught by the caller.
 */
export async function handleContextMenuClick(
  info: ContextMenuInfo,
  adapter: ITabAdapter,
  clipService: IClipService,
): Promise<void> {
  if (info.menuItemId !== 'clip-page' && info.menuItemId !== 'clip-selection') return;
  const tab = await adapter.getActiveTab();
  // info.selectionText not forwarded yet — ClipRequest.selectedText field is pending
  await clipService.clip({ tabId: tab.id, destinationId: 'default' });
}

/**
 * Wires the keyboard command handler to the clip service. Invokes
 * `clip()` when the `clip-page` command fires and logs unknown commands.
 */
export function wireCommands(adapter: ChromeAdapter, clipService: IClipService): void {
  adapter.onCommand((command) => {
    if (command !== 'clip-page') {
      logger.warn('Unknown command', { command });
      return;
    }
    runClipForActiveTab(adapter, clipService).catch((err: unknown) => {
      logger.error('Command handler failed', err);
    });
  });
}

/**
 * Resolves the active tab and asks the clip service to clip it into the
 * default destination. Used by both keyboard commands and context menus.
 */
export async function runClipForActiveTab(
  adapter: ChromeAdapter,
  clipService: IClipService,
): Promise<void> {
  const tab = await adapter.getActiveTab();
  await clipService.clip({ tabId: tab.id, destinationId: 'default' });
}

/**
 * Handles a {@link PreviewPageMessage} by calling `clipService.preview()` and
 * returning the compiled markdown to the popup via `sendResponse`.
 */
export async function handlePreviewMessage(
  msg: PreviewPageMessage,
  clipService: IClipService,
  sendResponse: (r: PreviewPageResponse) => void,
): Promise<void> {
  // msg.templateId is intentionally not forwarded — TemplatePlugin reads
  // selectedTemplateId directly from the popup store via the beforeClip hook.
  try {
    const previewMarkdown = await clipService.preview();
    sendResponse({ ok: true, previewMarkdown });
  } catch (err: unknown) {
    const error = normalizeError(err);
    sendResponse({ ok: false, error });
  }
}

/**
 * Dispatches a validated {@link ClipPageMessage} to the clip service, resolving
 * the active tab id and calling `sendResponse` with the outcome. Exported for
 * direct unit-testing.
 */
export async function handleClipMessage(
  msg: ClipPageMessage,
  adapter: Pick<ITabAdapter, 'getActiveTab'>,
  clipService: IClipService,
  sendResponse: (response?: unknown) => void,
): Promise<void> {
  const tab = await adapter.getActiveTab();
  let result: Awaited<ReturnType<IClipService['clip']>>;
  try {
    result = await clipService.clip({
      tabId: tab.id,
      destinationId: msg.destinationId,
      previewMarkdown: msg.previewMarkdown,
    });
  } catch (err: unknown) {
    sendResponse({ ok: false, error: normalizeError(err) });
    return;
  }
  if ('aborted' in result) {
    sendResponse({ ok: false, error: result.reason });
  } else {
    sendResponse({ ok: true, fileName: result.fileName, destination: result.destination });
  }
}

/**
 * Handles a {@link ToggleReaderMessage} by resolving the active tab and
 * calling `readerService.toggle(tabId, msg.settings)`. Exported for unit-testing.
 */
export async function handleToggleReaderMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab'>,
  readerService: Pick<IReaderService, 'toggle'>,
  msg: ToggleReaderMessage,
  sendResponse: (response?: unknown) => void,
): Promise<void> {
  const tab = await adapter.getActiveTab();
  if (tab?.id === undefined) {
    sendResponse({ ok: false });
    return;
  }
  await readerService.toggle(tab.id, msg.settings);
  sendResponse({ ok: true });
}

/**
 * Services bag shared by {@link wireMessageListener} and
 * {@link wireMessageListenerDeferred}.
 */
export interface MessageListenerServices {
  readonly clipService: IClipService;
  readonly readerService: IReaderService;
}

/**
 * Registers an `onMessage` listener that resolves services lazily from the
 * supplied promise. Calling this BEFORE any `await` in the bootstrap function
 * ensures Chrome sees a listener even when the service worker is restarted and
 * the popup fires a preview request during initialisation — preventing the MV3
 * "receiving end does not exist" race condition.
 */
export function wireMessageListenerDeferred(
  adapter: Pick<IRuntimeAdapter, 'onMessage'> & Pick<ITabAdapter, 'getActiveTab'>,
  servicesPromise: Promise<MessageListenerServices>,
): void {
  adapter.onMessage((msg, sendResponse) => {
    servicesPromise
      .then(({ clipService, readerService }) => {
        if (isPreviewPageMessage(msg)) {
          handlePreviewMessage(
            msg,
            clipService,
            sendResponse as (r: PreviewPageResponse) => void,
          ).catch((err: unknown) => {
            logger.error('preview message handler failed', err);
          });
          return;
        }
        if (isClipPageMessage(msg)) {
          handleClipMessage(msg, adapter, clipService, sendResponse).catch((err: unknown) => {
            logger.error('clip message handler failed', err);
          });
          return;
        }
        if (isToggleReaderMessage(msg)) {
          handleToggleReaderMessage(adapter, readerService, msg, sendResponse).catch(
            (err: unknown) => {
              logger.error('toggle-reader message handler failed', err);
            },
          );
        }
      })
      .catch((err: unknown) => {
        logger.error('message listener services unavailable', err);
      });
  });
}

/**
 * Registers a `chrome.runtime.onMessage` listener that handles
 * {@link PreviewPageMessage}, {@link ClipPageMessage}, and
 * {@link ToggleReaderMessage} requests from the popup and side-panel.
 */
export function wireMessageListener(
  adapter: Pick<IRuntimeAdapter, 'onMessage'> & Pick<ITabAdapter, 'getActiveTab'>,
  clipService: IClipService,
  readerService: IReaderService,
): void {
  wireMessageListenerDeferred(adapter, Promise.resolve({ clipService, readerService }));
}
