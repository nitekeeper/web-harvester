/**
 * Lightweight, framework-agnostic representation of a browser tab as exposed
 * to the rest of the application. Mirrors the subset of Chrome's `Tab` shape
 * the application actually uses.
 */
export interface Tab {
  readonly id: number;
  readonly url: string;
  readonly title: string;
}

/**
 * Browser tab adapter — the only seam through which the application interacts
 * with tabs (querying the active tab, executing scripts, sending messages,
 * subscribing to tab lifecycle events).
 */
export interface ITabAdapter {
  getActiveTab(): Promise<Tab>;
  executeScript(tabId: number, fn: () => void): Promise<void>;
  insertCSS(tabId: number, css: string): Promise<void>;
  removeCSS(tabId: number, css: string): Promise<void>;
  sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>;
  onTabActivated(handler: (tabId: number) => void): void;
  onTabUpdated(handler: (tabId: number, url: string) => void): void;
}
