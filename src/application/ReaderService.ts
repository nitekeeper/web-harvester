// src/application/ReaderService.ts

import { defaultReaderSettings, type ReaderSettings } from '@domain/reader/reader';
import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';

// ── Port interfaces ───────────────────────────────────────────────────────────

/**
 * Minimal adapter port needed by `ReaderService`. The content script owns the
 * CSS lifecycle; the background only forwards activate/deactivate messages.
 */
export interface IReaderTabAdapterPort {
  sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>;
}

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Snapshot of the reader-mode state for the most recently toggled tab.
 */
export interface ReaderState {
  readonly isActive: boolean;
  readonly tabId: number | undefined;
}

/**
 * Public surface of the reader service.
 */
export interface IReaderService {
  /** Toggle reader mode for the given tab. Sends READER_ACTIVATE or READER_DEACTIVATE. */
  toggle(tabId: number, settings?: ReaderSettings): Promise<void>;
  /** Whether reader mode is currently active for `tabId`. */
  isActive(tabId: number): boolean;
  /** Snapshot of state for the most recently toggled tab. */
  getState(): ReaderState;
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Application service that manages reader mode by sending READER_ACTIVATE /
 * READER_DEACTIVATE messages to the content script via the tab adapter.
 * Tracks which tabs have reader mode active so `toggle()` can decide direction.
 */
export class ReaderService implements IReaderService {
  private readonly activeTabIds = new Set<number>();
  private lastTabId: number | undefined;

  constructor(
    private readonly tabAdapter: IReaderTabAdapterPort,
    private readonly logger: ILogger = createLogger('ReaderService'),
  ) {}

  /**
   * Toggles reader mode for `tabId`. Sends READER_ACTIVATE with settings on
   * first call, READER_DEACTIVATE on the next. Tracks active state per tab.
   */
  async toggle(tabId: number, settings: ReaderSettings = defaultReaderSettings()): Promise<void> {
    this.lastTabId = tabId;

    if (this.activeTabIds.has(tabId)) {
      await this.tabAdapter.sendMessageToTab(tabId, { type: 'READER_DEACTIVATE' });
      this.activeTabIds.delete(tabId);
      this.logger.info('Reader mode deactivated', { tabId });
    } else {
      await this.tabAdapter.sendMessageToTab(tabId, { type: 'READER_ACTIVATE', settings });
      this.activeTabIds.add(tabId);
      this.logger.info('Reader mode activated', { tabId });
    }
  }

  /** Returns whether reader mode is currently active for `tabId`. */
  isActive(tabId: number): boolean {
    return this.activeTabIds.has(tabId);
  }

  /**
   * Returns the state of the most recently toggled tab. Before any call to
   * `toggle()`, returns `{ isActive: false, tabId: undefined }`.
   */
  getState(): ReaderState {
    if (this.lastTabId === undefined) {
      return { isActive: false, tabId: undefined };
    }
    return {
      isActive: this.activeTabIds.has(this.lastTabId),
      tabId: this.lastTabId,
    };
  }
}

export { defaultReaderSettings, type ReaderSettings } from '@domain/reader/reader';
export { generateReaderCSS } from '@domain/reader/reader-styles';
