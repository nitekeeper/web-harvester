/**
 * Side-panel adapter — opens the extension's side panel for a tab and toggles
 * whether it is enabled per-tab. Wraps `chrome.sidePanel.*`.
 */
export interface ISidePanelAdapter {
  openSidePanel(tabId: number): Promise<void>;
  setSidePanelEnabled(tabId: number, enabled: boolean): Promise<void>;
}
