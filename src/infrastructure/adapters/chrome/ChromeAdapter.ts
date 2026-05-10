import { createLogger } from '@shared/logger.js';

import type { IActionAdapter } from '../interfaces/IActionAdapter.js';
import type { IClipboardAdapter } from '../interfaces/IClipboardAdapter.js';
import type { ICommandAdapter } from '../interfaces/ICommandAdapter.js';
import type {
  IContextMenuAdapter,
  ContextMenuOptions,
  ContextMenuInfo,
} from '../interfaces/IContextMenuAdapter.js';
import type { INotificationAdapter } from '../interfaces/INotificationAdapter.js';
import type { IRuntimeAdapter } from '../interfaces/IRuntimeAdapter.js';
import type { ISidePanelAdapter } from '../interfaces/ISidePanelAdapter.js';
import type { IStorageAdapter } from '../interfaces/IStorageAdapter.js';
import type { ITabAdapter, Tab } from '../interfaces/ITabAdapter.js';

const logger = createLogger('chrome-adapter');

function isWebPageTab(t: chrome.tabs.Tab): t is chrome.tabs.Tab & { id: number; url: string } {
  return (
    t.id !== undefined && !!t.url && (t.url.startsWith('http://') || t.url.startsWith('https://'))
  );
}

/**
 * ChromeAdapter — single seam through which the application interacts with
 * `chrome.*` extension APIs. Implements all 9 browser adapter interfaces so
 * one concrete instance can be bound to every adapter token in the DI
 * container.
 *
 * Note: `chrome.*` APIs are only available inside a Chrome extension context.
 * This class is covered by Tier 2 browser integration tests, not unit tests.
 */
export class ChromeAdapter
  implements
    ITabAdapter,
    IStorageAdapter,
    IRuntimeAdapter,
    INotificationAdapter,
    ICommandAdapter,
    IContextMenuAdapter,
    IActionAdapter,
    ISidePanelAdapter,
    IClipboardAdapter
{
  // ── ITabAdapter ──────────────────────────────────────────────────────────

  async getActiveTab(): Promise<Tab> {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || !tab.url) throw new Error('No active tab found');
    return { id: tab.id, url: tab.url, title: tab.title ?? '' };
  }

  async getWebPageTab(): Promise<Tab> {
    // The url filter in chrome.tabs.query requires the `tabs` permission, which
    // this extension does not declare. Instead we query all tabs in the current
    // window and filter the results ourselves — chrome populates tab.url for
    // http/https tabs via the <all_urls> host_permission grant.
    const windowTabs = await chrome.tabs.query({ currentWindow: true });
    const webTab = windowTabs.find(isWebPageTab);
    if (webTab) return { id: webTab.id, url: webTab.url, title: webTab.title ?? '' };
    // Fall back to any window (e.g. settings page opened in a separate window).
    const allTabs = await chrome.tabs.query({});
    const fallback = allTabs.find(isWebPageTab);
    if (!fallback) throw new Error('No web page tab found');
    return { id: fallback.id, url: fallback.url, title: fallback.title ?? '' };
  }

  async executeScript(tabId: number, fn: () => void): Promise<void> {
    await chrome.scripting.executeScript({ target: { tabId }, func: fn });
  }

  async evaluateOnTab<T>(tabId: number, fn: () => T): Promise<T> {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: fn });
    const first = results[0];
    if (!first) throw new Error(`executeScript returned no result for tab ${tabId.toString()}`);
    return first.result as T;
  }

  async insertCSS(tabId: number, css: string): Promise<void> {
    await chrome.scripting.insertCSS({ target: { tabId }, css });
  }

  async removeCSS(tabId: number, css: string): Promise<void> {
    await chrome.scripting.removeCSS({ target: { tabId }, css });
  }

  async sendMessageToTab(tabId: number, msg: unknown): Promise<unknown> {
    return chrome.tabs.sendMessage(tabId, msg);
  }

  onTabActivated(handler: (tabId: number) => void): void {
    chrome.tabs.onActivated.addListener((info) => handler(info.tabId));
  }

  onTabUpdated(handler: (tabId: number, url: string) => void): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) handler(tabId, changeInfo.url);
    });
  }

  // ── IStorageAdapter ───────────────────────────────────────────────────────

  async getLocal(key: string): Promise<unknown> {
    const result = await chrome.storage.local.get(key);
    return Object.prototype.hasOwnProperty.call(result, key) ? Reflect.get(result, key) : undefined;
  }

  async setLocal(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  async removeLocal(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  async getSync(key: string): Promise<unknown> {
    const result = await chrome.storage.sync.get(key);
    return Object.prototype.hasOwnProperty.call(result, key) ? Reflect.get(result, key) : undefined;
  }

  async setSync(key: string, value: unknown): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }

  async removeSync(key: string): Promise<void> {
    await chrome.storage.sync.remove(key);
  }

  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void {
    chrome.storage.onChanged.addListener((changes) => {
      const mapped: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [key, change] of Object.entries(changes)) {
        Reflect.set(mapped, key, {
          oldValue: change.oldValue,
          newValue: change.newValue,
        });
      }
      handler(mapped);
    });
  }

  // ── IRuntimeAdapter ───────────────────────────────────────────────────────

  async sendMessage(msg: unknown): Promise<unknown> {
    return chrome.runtime.sendMessage(msg);
  }

  onMessage(handler: (msg: unknown, sendResponse: (response?: unknown) => void) => void): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      handler(message, sendResponse);
      return true; // keep the message channel open for async responses
    });
  }

  getURL(path: string): string {
    return chrome.runtime.getURL(path);
  }

  openOptionsPage(): void {
    chrome.runtime.openOptionsPage().catch((err: unknown) => {
      logger.error('openOptionsPage failed', err);
    });
  }

  onInstalled(
    handler: (reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update') => void,
  ): void {
    chrome.runtime.onInstalled.addListener((details) => {
      handler(details.reason as Parameters<typeof handler>[0]);
    });
  }

  // ── INotificationAdapter ──────────────────────────────────────────────────

  showNotification(id: string, msg: string): void {
    chrome.notifications
      .create(id, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        title: 'Web Harvester',
        message: msg,
      })
      .catch((err: unknown) => {
        logger.error('showNotification failed', err);
      });
  }

  clearNotification(id: string): void {
    chrome.notifications.clear(id).catch((err: unknown) => {
      logger.error('clearNotification failed', err);
    });
  }

  // ── ICommandAdapter ───────────────────────────────────────────────────────

  onCommand(handler: (command: string) => void): void {
    chrome.commands.onCommand.addListener(handler);
  }

  // ── IContextMenuAdapter ───────────────────────────────────────────────────

  createContextMenu(options: ContextMenuOptions): void {
    chrome.contextMenus.create({
      id: options.id,
      title: options.title,
      contexts: [...options.contexts] as [
        chrome.contextMenus.ContextType,
        ...chrome.contextMenus.ContextType[],
      ],
      parentId: options.parentId,
    });
  }

  removeContextMenu(id: string): void {
    chrome.contextMenus.remove(id).catch((err: unknown) => {
      logger.error('removeContextMenu failed', err);
    });
  }

  /** Removes all context-menu items so they can be re-registered on service-worker restart. */
  async removeAllContextMenus(): Promise<void> {
    await chrome.contextMenus.removeAll();
  }

  onContextMenuClick(handler: (info: ContextMenuInfo) => void): void {
    chrome.contextMenus.onClicked.addListener((info) => {
      handler({
        menuItemId: String(info.menuItemId),
        selectionText: info.selectionText,
        pageUrl: info.pageUrl ?? '',
      });
    });
  }

  // ── IActionAdapter ────────────────────────────────────────────────────────

  setBadgeText(text: string, tabId?: number): void {
    chrome.action
      .setBadgeText({
        text,
        ...(tabId !== undefined ? { tabId } : {}),
      })
      .catch((err: unknown) => {
        logger.error('setBadgeText failed', err);
      });
  }

  setBadgeColor(color: string): void {
    chrome.action.setBadgeBackgroundColor({ color }).catch((err: unknown) => {
      logger.error('setBadgeColor failed', err);
    });
  }

  setIcon(path: string): void {
    chrome.action.setIcon({ path }).catch((err: unknown) => {
      logger.error('setIcon failed', err);
    });
  }

  openPopup(): void {
    chrome.action.openPopup().catch((err: unknown) => {
      logger.error('openPopup failed', err);
    });
  }

  // ── ISidePanelAdapter ─────────────────────────────────────────────────────

  async openSidePanel(tabId: number): Promise<void> {
    await chrome.sidePanel.open({ tabId });
  }

  async setSidePanelEnabled(tabId: number, enabled: boolean): Promise<void> {
    await chrome.sidePanel.setOptions({ tabId, enabled });
  }

  // ── IClipboardAdapter ─────────────────────────────────────────────────────

  async writeText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  async readText(): Promise<string> {
    return navigator.clipboard.readText();
  }
}
