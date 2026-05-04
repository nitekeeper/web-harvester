// src/application/ReaderService.ts

import { READER_CSS } from '@domain/reader/reader-styles';
import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';

// ── Port interfaces (subset used by this service) ────────────────────────────

/**
 * Minimal adapter port needed by `ReaderService` — requires `insertCSS` and
 * `removeCSS`.
 *
 * Defined locally so this service stays within the application layer's
 * allowed import surface (`domain/` and `shared/` only).
 */
export interface IReaderTabAdapterPort {
  insertCSS(tabId: number, css: string): Promise<void>;
  removeCSS(tabId: number, css: string): Promise<void>;
}

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Snapshot of the reader-mode state for the most recently toggled tab.
 *
 * `tabId` is `undefined` until `toggle()` has been called at least once;
 * `isActive` reflects whether reader mode is currently enabled on that tab.
 */
export interface ReaderState {
  readonly isActive: boolean;
  readonly tabId: number | undefined;
}

/**
 * Public surface of the reader service. Toggles reader-mode CSS injection
 * per tab and exposes per-tab and last-toggled-tab state.
 */
export interface IReaderService {
  /** Toggle reader mode for the given tab — injects CSS on first call, removes on second. */
  toggle(tabId: number): Promise<void>;
  /** Whether reader mode is currently active for `tabId`. */
  isActive(tabId: number): boolean;
  /** Snapshot of state for the most recently toggled tab. */
  getState(): ReaderState;
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Application service that manages reader mode by injecting and removing
 * `READER_CSS` per tab via an injected tab adapter port. Tracks which tabs
 * currently have reader mode active so `toggle()` can decide whether to
 * inject or remove, and remembers the most recently toggled tab for
 * `getState()`.
 */
export class ReaderService implements IReaderService {
  private readonly activeTabIds = new Set<number>();
  private lastTabId: number | undefined;

  /**
   * @param tabAdapter - Tab port providing `insertCSS` and `removeCSS`.
   * @param logger - Scoped logger; defaults to a `ReaderService`-scoped logger.
   */
  constructor(
    private readonly tabAdapter: IReaderTabAdapterPort,
    private readonly logger: ILogger = createLogger('ReaderService'),
  ) {}

  /**
   * Toggles reader mode for `tabId`. On first call for a given tab, injects
   * `READER_CSS`; on the next call, removes it. Updates the internal active
   * set and remembers `tabId` as the most recently toggled tab so
   * `getState()` reflects the latest action.
   */
  async toggle(tabId: number): Promise<void> {
    this.lastTabId = tabId;

    if (this.activeTabIds.has(tabId)) {
      await this.tabAdapter.removeCSS(tabId, READER_CSS);
      this.activeTabIds.delete(tabId);
      this.logger.info('Reader mode deactivated', { tabId });
    } else {
      await this.tabAdapter.insertCSS(tabId, READER_CSS);
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
