/**
 * Options used to register a context-menu entry. Matches the subset of
 * `chrome.contextMenus.create` parameters the application uses.
 */
export interface ContextMenuOptions {
  readonly id: string;
  readonly title: string;
  readonly contexts: readonly string[];
  readonly parentId?: string;
}

/**
 * Information delivered to a context-menu click handler — the clicked menu
 * item id, the active selection (if any), and the page URL where the click
 * occurred.
 */
export interface ContextMenuInfo {
  readonly menuItemId: string;
  readonly selectionText?: string;
  readonly pageUrl: string;
}

/**
 * Context-menu adapter — registers and removes menu entries and dispatches
 * click events. Wraps `chrome.contextMenus.*`.
 */
export interface IContextMenuAdapter {
  createContextMenu(options: ContextMenuOptions): void;
  removeContextMenu(id: string): void;
  /** Removes all context-menu items. Used before re-registering items on service-worker restart. */
  removeAllContextMenus(): Promise<void>;
  onContextMenuClick(handler: (info: ContextMenuInfo) => void): void;
}
