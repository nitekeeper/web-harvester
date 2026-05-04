/**
 * Browser action (toolbar button) adapter — controls badge text/color, icon,
 * and programmatic popup activation. Wraps `chrome.action.*`.
 */
export interface IActionAdapter {
  setBadgeText(text: string, tabId?: number): void;
  setBadgeColor(color: string): void;
  setIcon(path: string): void;
  openPopup(): void;
}
