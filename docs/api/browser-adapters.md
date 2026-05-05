# Browser Adapter Interfaces API

## Overview

The nine browser adapter interfaces are the seam between the application layer and the Chrome
extension APIs. All application and domain code depends on these interfaces — never on the
concrete `ChromeAdapter` class. In production the single `ChromeAdapter` instance implements
all nine. In tests, `MockAdapter` (in `tests/helpers/MockAdapter.ts`) provides in-memory stubs.

Import the interfaces from `@infrastructure/adapters/interfaces/` and their DI tokens from
`@infrastructure/adapters/tokens`.

---

## `ITabAdapter`

Tab operations: query the active tab, inject scripts and CSS, send messages, and subscribe to
tab lifecycle events.

### Methods

#### `getActiveTab(): Promise<Tab>`

Returns the active tab in the current window. Resolves to `{ id, url, title }`.

#### `executeScript(tabId: number, fn: () => void): Promise<void>`

Executes `fn` in the context of the given tab.

#### `insertCSS(tabId: number, css: string): Promise<void>`

Injects a CSS string into the given tab's document.

#### `sendMessageToTab(tabId: number, msg: unknown): Promise<unknown>`

Sends a message to the content script running in the given tab. Resolves with the response.

#### `onTabActivated(handler: (tabId: number) => void): void`

Registers a listener that fires whenever the user switches to a different tab.

#### `onTabUpdated(handler: (tabId: number, url: string) => void): void`

Registers a listener that fires when a tab's URL changes.

---

## `IStorageAdapter`

Key/value storage across the `local` and `sync` storage areas.

### Methods

#### `getLocal(key: string): Promise<unknown>`

Reads a value from `chrome.storage.local`.

#### `setLocal(key: string, value: unknown): Promise<void>`

Writes a value to `chrome.storage.local`.

#### `removeLocal(key: string): Promise<void>`

Deletes a key from `chrome.storage.local`.

#### `getSync(key: string): Promise<unknown>`

Reads a value from `chrome.storage.sync`.

#### `setSync(key: string, value: unknown): Promise<void>`

Writes a value to `chrome.storage.sync`.

#### `removeSync(key: string): Promise<void>`

Deletes a key from `chrome.storage.sync`.

#### `onChanged(handler): void`

Registers a listener for any storage change. The handler receives a changes map keyed by storage
key, with `{ oldValue?, newValue? }` per key.

---

## `IRuntimeAdapter`

Cross-context messaging, URL resolution, and lifecycle events.

### Methods

#### `sendMessage(msg: unknown): Promise<unknown>`

Sends a message to the extension's background service worker. Resolves with the response.

#### `onMessage(handler): void`

Registers a listener for incoming runtime messages. The handler receives `(msg, sendResponse)`.

#### `getURL(path: string): string`

Resolves a relative extension path to its full `chrome-extension://` URL.

#### `openOptionsPage(): void`

Opens the extension's options page.

#### `onInstalled(handler): void`

Registers a listener that fires on install or update. The handler receives the install `reason`
(`'install' | 'update' | 'chrome_update' | 'shared_module_update'`).

### Cross-context IPC pattern

Use `sendMessage` / `onMessage` to invoke background service worker logic from popup or
side-panel pages. The typed message contract lives in `src/shared/messages.ts` — import
`MSG_CLIP`, `ClipPageMessage`, `ClipPageResponse`, and `isClipPageMessage` from there.

**Popup → background (send side):**

```ts
// composition root (popup/index.tsx, side-panel.ts)
const response = (await adapter.sendMessage({ type: MSG_CLIP, destinationId })) as ClipPageResponse;
```

**Background (receive side):**

```ts
// wiring.ts
adapter.onMessage((msg, sendResponse) => {
  if (!isClipPageMessage(msg)) return;
  // ... call service, then sendResponse({ ok: true, ... })
});
```

`ChromeAdapter.onMessage` returns `true` to the Chrome API so the channel stays open for
async `sendResponse` calls. Non-clip messages are ignored by the `isClipPageMessage` guard.

---

## `INotificationAdapter`

System notification display and dismissal.

### Methods

#### `showNotification(id: string, msg: string): void`

Shows a system notification with the given `id` and message text. Fire-and-forget.

#### `clearNotification(id: string): void`

Dismisses the notification with the given `id`. Fire-and-forget.

---

## `ICommandAdapter`

Keyboard shortcut commands declared in the extension manifest.

### Methods

#### `onCommand(handler: (command: string) => void): void`

Registers a listener that fires when the user triggers a keyboard shortcut. The handler receives
the command identifier string from the manifest.

---

## `IContextMenuAdapter`

Context-menu entry registration and click events.

### Types

```typescript
interface ContextMenuOptions {
  readonly id: string;
  readonly title: string;
  readonly contexts: readonly string[]; // e.g. ['selection', 'page']
  readonly parentId?: string;
}

interface ContextMenuInfo {
  readonly menuItemId: string;
  readonly selectionText?: string;
  readonly pageUrl: string;
}
```

### Methods

#### `createContextMenu(options: ContextMenuOptions): void`

Creates a context-menu entry. Fire-and-forget.

#### `removeContextMenu(id: string): void`

Removes a context-menu entry by `id`. Fire-and-forget.

#### `onContextMenuClick(handler: (info: ContextMenuInfo) => void): void`

Registers a listener for context-menu item clicks.

---

## `IActionAdapter`

Toolbar button badge, icon, and popup control.

### Methods

#### `setBadgeText(text: string, tabId?: number): void`

Sets the badge text on the toolbar button. Pass an empty string to clear the badge. `tabId` scopes
the badge to a specific tab; omit it to set the badge globally.

#### `setBadgeColor(color: string): void`

Sets the badge background colour. Accepts any CSS colour string.

#### `setIcon(path: string): void`

Sets the toolbar button icon to the image at `path`.

#### `openPopup(): void`

Programmatically opens the extension popup.

---

## `ISidePanelAdapter`

Side-panel visibility per tab.

### Methods

#### `openSidePanel(tabId: number): Promise<void>`

Opens the extension's side panel for the given tab.

#### `setSidePanelEnabled(tabId: number, enabled: boolean): Promise<void>`

Enables or disables the side panel for the given tab.

---

## `IClipboardAdapter`

System clipboard read/write.

### Methods

#### `writeText(text: string): Promise<void>`

Writes `text` to the clipboard. Rejects if the document does not have clipboard-write permission.

#### `readText(): Promise<string>`

Reads the current clipboard text. Rejects if the document does not have clipboard-read permission.

---

## Usage Example

```typescript
import type { ITabAdapter } from '@infrastructure/adapters/interfaces/ITabAdapter';
import { TYPES } from '@infrastructure/adapters/tokens';

// Resolve from DI container
const tabs = container.get<ITabAdapter>(TYPES.ITabAdapter);
const activeTab = await tabs.getActiveTab();
console.log(activeTab.url);

// In tests, use MockAdapter from tests/helpers/MockAdapter.ts
```

## Notes

- Never import from `ChromeAdapter` directly. Depend only on the interface types.
- The concrete `ChromeAdapter` is the only file in the project allowed to call `chrome.*` APIs.
- All DI tokens for these interfaces are available as `TYPES.*` from
  `@infrastructure/adapters/tokens`.
- Event-listener methods (`onTabActivated`, `onChanged`, `onCommand`, etc.) register exactly one
  listener per call. To support multiple listeners, the caller must fan out from a single
  registration.
