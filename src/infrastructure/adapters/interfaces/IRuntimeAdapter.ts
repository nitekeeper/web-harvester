/**
 * Extension runtime adapter — wraps the browser runtime API for cross-context
 * messaging, URL resolution, options-page activation, and lifecycle
 * (install/update) notifications.
 */
export interface IRuntimeAdapter {
  sendMessage(msg: unknown): Promise<unknown>;
  onMessage(handler: (msg: unknown, sendResponse: (response?: unknown) => void) => void): void;
  getURL(path: string): string;
  openOptionsPage(): void;
  onInstalled(
    handler: (reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update') => void,
  ): void;
}
