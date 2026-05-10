// src/presentation/background/wiring.ts
//
// Lifecycle event-wiring helpers used by the background composition root.
// These connect the `ChromeAdapter` event sources (install, context menu,
// keyboard commands) to the application-layer `ClipService`. Extracted from
// `background.ts` so that file stays under the 400-line limit. See ADR-020
// for the rationale behind the cross-layer imports.

import { type IClipService } from '@application/ClipService';
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
  isCssPickerResultMessage,
  isHighlightModeExitedMessage,
  isPickerResultMessage,
  isPreviewPageMessage,
  isStartCssPickerMessage,
  isStartHighlightMessage,
  isStartPickerMessage,
  isStopCssPickerMessage,
  isStopHighlightMessage,
  isStopPickerMessage,
  isToggleReaderMessage,
  type ClipPageMessage,
  type CssPickerResultMessage,
  type PickerResultMessage,
  type PreviewPageMessage,
  type PreviewPageResponse,
  type StartPickerMessage,
  type ToggleReaderMessage,
  CSS_PICKER_RESULT_KEY,
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
  try {
    const previewMarkdown = await clipService.preview(msg.templateId ?? undefined);
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
 * forwarding either `READER_ACTIVATE` or `READER_DEACTIVATE` directly to the
 * content script based on `msg.activate`. No in-memory state is consulted so
 * the handler is safe to call after an MV3 service-worker restart.
 * Exported for unit-testing.
 */
export async function handleToggleReaderMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  msg: ToggleReaderMessage,
  sendResponse: (response?: unknown) => void,
): Promise<void> {
  const tab = await adapter.getActiveTab();
  if (tab?.id === undefined) {
    sendResponse({ ok: false });
    return;
  }
  if (msg.activate) {
    await adapter.sendMessageToTab(tab.id, { type: 'READER_ACTIVATE', settings: msg.settings });
  } else {
    await adapter.sendMessageToTab(tab.id, { type: 'READER_DEACTIVATE' });
  }
  sendResponse({ ok: true });
}

/** Minimal storage port needed for highlight-mode-exited state sync. */
export interface IWiringStoragePort {
  getLocal(key: string): Promise<unknown>;
  setLocal(key: string, value: unknown): Promise<void>;
}

/** Storage key for the shared popup state persisted by the background. */
const POPUP_STATE_KEY = 'popup-state';

/** Reads and normalises the shared popup-state record from storage. */
async function readPopupState(storage: IWiringStoragePort): Promise<Record<string, unknown>> {
  const raw = await storage.getLocal(POPUP_STATE_KEY);
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
}

/**
 * Resolves the id of the currently active tab. Calls `sendResponse({ ok: false })`
 * and returns `undefined` when there is no active tab or its id is missing.
 */
async function resolveActiveTabId(
  adapter: Pick<ITabAdapter, 'getActiveTab'>,
  sendResponse: (r: unknown) => void,
): Promise<number | undefined> {
  const tab = await adapter.getActiveTab();
  if (tab?.id === undefined) {
    sendResponse({ ok: false });
    return undefined;
  }
  return tab.id;
}

/**
 * Sends a typed command message to the active tab. Responds `ok: false` when
 * there is no active tab id, or `ok: true` after the message is delivered.
 */
async function sendCommandToTab(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  msgType: string,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const tabId = await resolveActiveTabId(adapter, sendResponse);
  if (tabId === undefined) return;
  await adapter.sendMessageToTab(tabId, { type: msgType });
  sendResponse({ ok: true });
}

/**
 * Forwards a start-highlight request to the active tab's content script.
 * Exported for unit-testing.
 */
export async function handleStartHighlightMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  await sendCommandToTab(adapter, 'START_HIGHLIGHT', sendResponse);
}

/**
 * Forwards a stop-highlight request to the active tab's content script.
 * Exported for unit-testing.
 */
export async function handleStopHighlightMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  await sendCommandToTab(adapter, 'STOP_HIGHLIGHT', sendResponse);
}

/**
 * Handles the content-script notification that the user exited highlight mode.
 * Writes `isHighlightActive: false` into the shared popup-state storage key
 * so the popup store can update reactively.
 * Exported for unit-testing.
 */
export async function handleHighlightModeExitedMessage(
  storage: IWiringStoragePort,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const current = await readPopupState(storage);
  await storage.setLocal(POPUP_STATE_KEY, { ...current, isHighlightActive: false });
  sendResponse({ ok: true });
}

/**
 * Sends START_PICKER to the active tab's content script and responds to the
 * popup immediately. The picker result arrives later via a separate
 * {@link PickerResultMessage} from the content script — this avoids keeping an
 * MV3 service-worker message channel open for the full duration of the
 * (potentially long) picker interaction, which would cause a "channel closed"
 * error when the service worker is suspended.
 */
export async function handleStartPickerMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  msg: StartPickerMessage,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const tabId = await resolveActiveTabId(adapter, sendResponse);
  if (tabId === undefined) return;
  adapter
    .sendMessageToTab(tabId, { type: 'START_PICKER', mode: msg.mode })
    .catch((err: unknown) => {
      logger.warn('START_PICKER delivery failed', err);
    });
  sendResponse({ ok: true });
}

/**
 * Handles a {@link PickerResultMessage} sent by the content script when the
 * user finishes a picker session. Writes `isPickerActive: false` and, on
 * confirm, the selected XPaths into the shared popup-state storage key so the
 * popup store can update reactively.
 */
export async function handlePickerResultMessage(
  msg: PickerResultMessage,
  storage: IWiringStoragePort,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const current = await readPopupState(storage);
  const updates: Record<string, unknown> = { ...current, isPickerActive: false };
  if (msg.result !== undefined) {
    updates['pickerResult'] = { excludedXPaths: msg.result.excludedXPaths ?? [] };
  }
  await storage.setLocal(POPUP_STATE_KEY, updates);
  sendResponse({ ok: true });
}

/**
 * Sends STOP_PICKER to the active tab's content script, tearing down any
 * active picker overlay.
 */
export async function handleStopPickerMessage(
  adapter: Pick<ITabAdapter, 'getActiveTab' | 'sendMessageToTab'>,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  await sendCommandToTab(adapter, 'STOP_PICKER', sendResponse);
}

/**
 * Sends `START_CSS_PICKER` to the active tab's content script and
 * acknowledges the caller immediately. The actual picker result arrives later
 * via a separate {@link CssPickerResultMessage} — this avoids holding the MV3
 * service-worker message channel open for the full duration of the interaction.
 */
export async function handleStartCssPickerMessage(
  adapter: Pick<ITabAdapter, 'getWebPageTab' | 'sendMessageToTab'>,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  const tab = await adapter.getWebPageTab();
  adapter.sendMessageToTab(tab.id, { type: 'START_CSS_PICKER' }).catch((err: unknown) => {
    logger.warn('START_CSS_PICKER delivery failed', err);
  });
  sendResponse({ ok: true });
}

/**
 * Stores the CSS picker result in local storage so the settings page can react
 * to it via a `storage.onChanged` listener. Exported for unit-testing.
 */
export async function handleCssPickerResultMessage(
  msg: CssPickerResultMessage,
  storage: IWiringStoragePort,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  await storage.setLocal(CSS_PICKER_RESULT_KEY, {
    selector: msg.selector,
    timestamp: Date.now(),
  });
  sendResponse({ ok: true });
}

/**
 * Services bag shared by {@link wireMessageListener} and
 * {@link wireMessageListenerDeferred}.
 */
export interface MessageListenerServices {
  readonly clipService: IClipService;
  readonly storageAdapter: IWiringStoragePort;
}

/** Adapter shape used internally by the message dispatcher. */
type MessageDispatchAdapter = Pick<
  ITabAdapter,
  'getActiveTab' | 'getWebPageTab' | 'sendMessageToTab'
>;

/**
 * Dispatches highlight-related messages to their handlers. Returns `true` if
 * the message was handled, `false` otherwise.
 */
function dispatchHighlightMessage(
  msg: unknown,
  sendResponse: (r: unknown) => void,
  adapter: MessageDispatchAdapter,
  storageAdapter: IWiringStoragePort,
): boolean {
  if (isStartHighlightMessage(msg)) {
    handleStartHighlightMessage(adapter, sendResponse).catch((err: unknown) => {
      logger.error('start-highlight handler failed', err);
    });
    return true;
  }
  if (isStopHighlightMessage(msg)) {
    handleStopHighlightMessage(adapter, sendResponse).catch((err: unknown) => {
      logger.error('stop-highlight handler failed', err);
    });
    return true;
  }
  if (isHighlightModeExitedMessage(msg)) {
    handleHighlightModeExitedMessage(storageAdapter, sendResponse).catch((err: unknown) => {
      logger.error('highlight-mode-exited handler failed', err);
    });
    return true;
  }
  return false;
}

/**
 * Dispatches picker-related messages to their handlers. Returns `true` if the
 * message was handled, `false` otherwise.
 */
function dispatchPickerMessage(
  msg: unknown,
  sendResponse: (r: unknown) => void,
  adapter: MessageDispatchAdapter,
  storageAdapter: IWiringStoragePort,
): boolean {
  if (isStartPickerMessage(msg)) {
    handleStartPickerMessage(adapter, msg, sendResponse).catch((err: unknown) => {
      logger.error('start-picker handler failed', err);
    });
    return true;
  }
  if (isStopPickerMessage(msg)) {
    handleStopPickerMessage(adapter, sendResponse).catch((err: unknown) => {
      logger.error('stop-picker handler failed', err);
    });
    return true;
  }
  if (isPickerResultMessage(msg)) {
    handlePickerResultMessage(msg, storageAdapter, sendResponse).catch((err: unknown) => {
      logger.error('picker-result handler failed', err);
    });
    return true;
  }
  return false;
}

/**
 * Dispatches CSS-picker-related messages to their handlers. Returns `true` if
 * the message was handled, `false` otherwise.
 */
function dispatchCssPickerMessage(
  msg: unknown,
  sendResponse: (r: unknown) => void,
  adapter: MessageDispatchAdapter,
  storageAdapter: IWiringStoragePort,
): boolean {
  if (isStartCssPickerMessage(msg)) {
    handleStartCssPickerMessage(adapter, sendResponse).catch((err: unknown) => {
      logger.error('start-css-picker handler failed', err);
    });
    return true;
  }
  if (isStopCssPickerMessage(msg)) {
    sendCommandToTab(adapter, 'STOP_CSS_PICKER', sendResponse).catch((err: unknown) => {
      logger.error('stop-css-picker handler failed', err);
    });
    return true;
  }
  if (isCssPickerResultMessage(msg)) {
    handleCssPickerResultMessage(msg, storageAdapter, sendResponse).catch((err: unknown) => {
      logger.error('css-picker-result handler failed', err);
    });
    return true;
  }
  return false;
}

/**
 * Dispatches a single incoming message to the appropriate handler.
 * Extracted from {@link wireMessageListenerDeferred} to keep each function
 * within the 40-line limit.
 */
function dispatchMessage(
  msg: unknown,
  sendResponse: (r: unknown) => void,
  adapter: MessageDispatchAdapter,
  services: MessageListenerServices,
): void {
  const { clipService, storageAdapter } = services;
  if (isPreviewPageMessage(msg)) {
    handlePreviewMessage(msg, clipService, sendResponse as (r: PreviewPageResponse) => void).catch(
      (err: unknown) => {
        logger.error('preview message handler failed', err);
      },
    );
    return;
  }
  if (isClipPageMessage(msg)) {
    handleClipMessage(msg, adapter, clipService, sendResponse).catch((err: unknown) => {
      logger.error('clip message handler failed', err);
    });
    return;
  }
  if (isToggleReaderMessage(msg)) {
    handleToggleReaderMessage(adapter, msg, sendResponse).catch((err: unknown) => {
      logger.error('toggle-reader message handler failed', err);
    });
    return;
  }
  if (dispatchHighlightMessage(msg, sendResponse, adapter, storageAdapter)) return;
  if (dispatchPickerMessage(msg, sendResponse, adapter, storageAdapter)) return;
  dispatchCssPickerMessage(msg, sendResponse, adapter, storageAdapter);
}

/**
 * Registers an `onMessage` listener that resolves services lazily from the
 * supplied promise. Calling this BEFORE any `await` in the bootstrap function
 * ensures Chrome sees a listener even when the service worker is restarted and
 * the popup fires a preview request during initialisation — preventing the MV3
 * "receiving end does not exist" race condition.
 */
export function wireMessageListenerDeferred(
  adapter: Pick<IRuntimeAdapter, 'onMessage'> &
    Pick<ITabAdapter, 'getActiveTab' | 'getWebPageTab' | 'sendMessageToTab'>,
  servicesPromise: Promise<MessageListenerServices>,
): void {
  adapter.onMessage((msg, sendResponse) => {
    servicesPromise
      .then((services) => {
        dispatchMessage(msg, sendResponse, adapter, services);
      })
      .catch((err: unknown) => {
        logger.error('message listener services unavailable', err);
      });
  });
}

/**
 * Registers a `chrome.runtime.onMessage` listener that handles
 * {@link PreviewPageMessage}, {@link ClipPageMessage}, {@link ToggleReaderMessage},
 * {@link StartHighlightMessage}, {@link StopHighlightMessage}, and
 * {@link HighlightModeExitedMessage} requests from the popup and content scripts.
 */
export function wireMessageListener(
  adapter: Pick<IRuntimeAdapter, 'onMessage'> &
    Pick<ITabAdapter, 'getActiveTab' | 'getWebPageTab' | 'sendMessageToTab'>,
  clipService: IClipService,
  storageAdapter: IWiringStoragePort,
): void {
  wireMessageListenerDeferred(adapter, Promise.resolve({ clipService, storageAdapter }));
}
