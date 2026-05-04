// tests/helpers/MockAdapter.ts

import { vi } from 'vitest';

import type {
  ITabAdapter,
  Tab,
  IStorageAdapter,
  IRuntimeAdapter,
  INotificationAdapter,
  ICommandAdapter,
  IContextMenuAdapter,
  IActionAdapter,
  ISidePanelAdapter,
  IClipboardAdapter,
} from '../../src/infrastructure/adapters/interfaces/index.js';

/**
 * In-memory mock implementation of all nine browser adapter interfaces
 * used in unit tests to substitute for the real Chrome APIs.
 */
export class MockAdapter
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
  private readonly _local = new Map<string, unknown>();
  private readonly _sync = new Map<string, unknown>();
  private readonly _changedHandlers: Array<
    (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void
  > = [];
  private _clipboard = '';

  // ── ITabAdapter ──────────────────────────────────────────────────────────

  async getActiveTab(): Promise<Tab> {
    return { id: 1, url: 'https://example.com', title: 'Example' };
  }

  executeScript = vi.fn().mockResolvedValue(undefined);
  insertCSS = vi.fn().mockResolvedValue(undefined);
  removeCSS = vi.fn().mockResolvedValue(undefined);
  sendMessageToTab = vi.fn().mockResolvedValue(undefined);
  onTabActivated = vi.fn();
  onTabUpdated = vi.fn();

  // ── IStorageAdapter ───────────────────────────────────────────────────────

  async getLocal(key: string): Promise<unknown> {
    return this._local.get(key);
  }

  async setLocal(key: string, value: unknown): Promise<void> {
    const oldValue = this._local.get(key);
    this._local.set(key, value);
    const entry: { oldValue?: unknown; newValue?: unknown } = {
      newValue: value,
    };
    if (oldValue !== undefined) entry.oldValue = oldValue;
    const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = { [key]: entry };
    for (const handler of this._changedHandlers) handler(changes);
  }

  async removeLocal(key: string): Promise<void> {
    this._local.delete(key);
  }

  async getSync(key: string): Promise<unknown> {
    return this._sync.get(key);
  }

  async setSync(key: string, value: unknown): Promise<void> {
    this._sync.set(key, value);
  }

  async removeSync(key: string): Promise<void> {
    this._sync.delete(key);
  }

  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void {
    this._changedHandlers.push(handler);
  }

  // ── IRuntimeAdapter ───────────────────────────────────────────────────────

  sendMessage = vi.fn().mockResolvedValue(undefined);
  onMessage = vi.fn();
  getURL = vi.fn((path: string) => `chrome-extension://mock/${path}`);
  openOptionsPage = vi.fn();
  onInstalled = vi.fn();

  // ── INotificationAdapter ──────────────────────────────────────────────────

  showNotification = vi.fn();
  clearNotification = vi.fn();

  // ── ICommandAdapter ───────────────────────────────────────────────────────

  onCommand = vi.fn();

  // ── IContextMenuAdapter ───────────────────────────────────────────────────

  createContextMenu = vi.fn();
  removeContextMenu = vi.fn();
  onContextMenuClick = vi.fn();

  // ── IActionAdapter ────────────────────────────────────────────────────────

  setBadgeText = vi.fn();
  setBadgeColor = vi.fn();
  setIcon = vi.fn();
  openPopup = vi.fn();

  // ── ISidePanelAdapter ─────────────────────────────────────────────────────

  openSidePanel = vi.fn().mockResolvedValue(undefined);
  setSidePanelEnabled = vi.fn().mockResolvedValue(undefined);

  // ── IClipboardAdapter ─────────────────────────────────────────────────────

  async writeText(text: string): Promise<void> {
    this._clipboard = text;
  }

  async readText(): Promise<string> {
    return this._clipboard;
  }

  // ── Test helpers ──────────────────────────────────────────────────────────

  /**
   * Simulates the runtime onInstalled event by invoking the most recently
   * registered handler with the given details. Returns the promise from the
   * handler so callers can await async work.
   */
  async triggerInstalled(details: {
    reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update';
  }): Promise<void> {
    const handler = (this.onInstalled as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as
      | ((reason: typeof details.reason) => void | Promise<void>)
      | undefined;
    if (handler) await handler(details.reason);
  }

  /**
   * Simulates an external storage.onChanged event (e.g., a write performed in
   * another browser context). Invokes every handler registered via
   * `onChanged` with the supplied changes record without touching the in-memory
   * `_local` map, so callers can model out-of-band updates without echoes.
   */
  triggerStorageChange(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void {
    for (const handler of this._changedHandlers) handler(changes);
  }
}
