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
import type { ITabAdapter } from '@infrastructure/adapters/interfaces/ITabAdapter';
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { createLogger } from '@shared/logger';

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
export function wireContextMenus(
  adapter: IContextMenuAdapter & ITabAdapter,
  clipService: IClipService,
): void {
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
