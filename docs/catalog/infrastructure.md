# Infrastructure Catalog

Functions, classes, interfaces, and types in `src/infrastructure/`. This layer is the only place where `chrome.*` APIs, the File System Access API, and IndexedDB appear directly.

---

## `src/infrastructure/adapters/interfaces/`

Nine browser adapter interfaces — the seam between application logic and browser APIs. All application and domain code depends on these interfaces, never on the concrete `ChromeAdapter`.

### `ITabAdapter` — `src/infrastructure/adapters/interfaces/ITabAdapter.ts`

| Name          | Kind      | Description                                                                                                                                                                                         |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab`         | Interface | Framework-agnostic browser tab: `{ id: number, url: string, title: string }`.                                                                                                                       |
| `ITabAdapter` | Interface | Tab operations: `getActiveTab()`, `executeScript(tabId, fn)`, `insertCSS(tabId, css)`, `removeCSS(tabId, css)`, `sendMessageToTab(tabId, msg)`, `onTabActivated(handler)`, `onTabUpdated(handler)`. |

### `IStorageAdapter` — `src/infrastructure/adapters/interfaces/IStorageAdapter.ts`

| Name              | Kind      | Description                                                                                                                                                                                                        |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `IStorageAdapter` | Interface | Chrome storage facade: `getLocal(key)`, `setLocal(key, value)`, `removeLocal(key)`, `getSync(key)`, `setSync(key, value)`, `removeSync(key)`, `onChanged(handler)`. All `get*`/`set*`/`remove*` methods are async. |

### `IRuntimeAdapter` — `src/infrastructure/adapters/interfaces/IRuntimeAdapter.ts`

| Name              | Kind      | Description                                                                                                                      |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `IRuntimeAdapter` | Interface | Extension runtime bridge: `sendMessage(msg)`, `onMessage(handler)`, `getURL(path)`, `openOptionsPage()`, `onInstalled(handler)`. |

### `INotificationAdapter` — `src/infrastructure/adapters/interfaces/INotificationAdapter.ts`

| Name                   | Kind      | Description                                                                               |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `INotificationAdapter` | Interface | `showNotification(id, msg)`, `clearNotification(id)`. Both synchronous (fire-and-forget). |

### `ICommandAdapter` — `src/infrastructure/adapters/interfaces/ICommandAdapter.ts`

| Name              | Kind      | Description                                                                 |
| ----------------- | --------- | --------------------------------------------------------------------------- |
| `ICommandAdapter` | Interface | `onCommand(handler)` — registers a listener for keyboard shortcut commands. |

### `IContextMenuAdapter` — `src/infrastructure/adapters/interfaces/IContextMenuAdapter.ts`

| Name                  | Kind      | Description                                                                           |
| --------------------- | --------- | ------------------------------------------------------------------------------------- |
| `ContextMenuOptions`  | Interface | Menu entry creation options: `id`, `title`, `contexts`, optional `parentId`.          |
| `ContextMenuInfo`     | Interface | Click event payload: `menuItemId`, optional `selectionText`, `pageUrl`.               |
| `IContextMenuAdapter` | Interface | `createContextMenu(options)`, `removeContextMenu(id)`, `onContextMenuClick(handler)`. |

### `IActionAdapter` — `src/infrastructure/adapters/interfaces/IActionAdapter.ts`

| Name             | Kind      | Description                                                                                           |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `IActionAdapter` | Interface | Toolbar button: `setBadgeText(text, tabId?)`, `setBadgeColor(color)`, `setIcon(path)`, `openPopup()`. |

### `ISidePanelAdapter` — `src/infrastructure/adapters/interfaces/ISidePanelAdapter.ts`

| Name                | Kind      | Description                                                                |
| ------------------- | --------- | -------------------------------------------------------------------------- |
| `ISidePanelAdapter` | Interface | `openSidePanel(tabId)`, `setSidePanelEnabled(tabId, enabled)`. Both async. |

### `IClipboardAdapter` — `src/infrastructure/adapters/interfaces/IClipboardAdapter.ts`

| Name                | Kind      | Description                                                               |
| ------------------- | --------- | ------------------------------------------------------------------------- |
| `IClipboardAdapter` | Interface | `writeText(text)`, `readText()`. Both async; wraps `navigator.clipboard`. |

### `index.ts` — `src/infrastructure/adapters/interfaces/index.ts`

Re-exports all nine interface modules as a single barrel import.

---

## `src/infrastructure/adapters/tokens.ts`

DI token registry for all adapter interfaces.

| Name    | Kind     | Description                                                                                                                                                                                                                                                                         |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TYPES` | Constant | `Readonly` record of `Symbol.for(...)` DI tokens for each of the nine browser adapter interfaces plus `ILogger`, `IPluginRegistry`, `IHookSystem`, `IUIRegistry`, `ISettingsStorage`, and `IDestinationStorage`. Used as binding/injection keys throughout the Inversify container. |

---

## `src/infrastructure/adapters/chrome/ChromeAdapter.ts`

The single concrete implementation of all nine browser adapter interfaces. **This is the only file in the project that calls `chrome.*` APIs.**

| Name            | Kind  | Description                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChromeAdapter` | Class | Implements `ITabAdapter`, `IStorageAdapter`, `IRuntimeAdapter`, `INotificationAdapter`, `ICommandAdapter`, `IContextMenuAdapter`, `IActionAdapter`, `ISidePanelAdapter`, `IClipboardAdapter`. One instance is created at extension startup and bound to all nine adapter tokens in the root DI container. Covered by Tier 2 browser integration tests only (not unit-testable without a real Chrome context). |

**Method summary:**

| Method                                | Interface            | Delegates to                                |
| ------------------------------------- | -------------------- | ------------------------------------------- |
| `getActiveTab()`                      | ITabAdapter          | `chrome.tabs.query`                         |
| `executeScript(tabId, fn)`            | ITabAdapter          | `chrome.scripting.executeScript`            |
| `insertCSS(tabId, css)`               | ITabAdapter          | `chrome.scripting.insertCSS`                |
| `sendMessageToTab(tabId, msg)`        | ITabAdapter          | `chrome.tabs.sendMessage`                   |
| `onTabActivated(handler)`             | ITabAdapter          | `chrome.tabs.onActivated.addListener`       |
| `onTabUpdated(handler)`               | ITabAdapter          | `chrome.tabs.onUpdated.addListener`         |
| `getLocal(key)`                       | IStorageAdapter      | `chrome.storage.local.get`                  |
| `setLocal(key, value)`                | IStorageAdapter      | `chrome.storage.local.set`                  |
| `removeLocal(key)`                    | IStorageAdapter      | `chrome.storage.local.remove`               |
| `getSync(key)`                        | IStorageAdapter      | `chrome.storage.sync.get`                   |
| `setSync(key, value)`                 | IStorageAdapter      | `chrome.storage.sync.set`                   |
| `removeSync(key)`                     | IStorageAdapter      | `chrome.storage.sync.remove`                |
| `onChanged(handler)`                  | IStorageAdapter      | `chrome.storage.onChanged.addListener`      |
| `sendMessage(msg)`                    | IRuntimeAdapter      | `chrome.runtime.sendMessage`                |
| `onMessage(handler)`                  | IRuntimeAdapter      | `chrome.runtime.onMessage.addListener`      |
| `getURL(path)`                        | IRuntimeAdapter      | `chrome.runtime.getURL`                     |
| `openOptionsPage()`                   | IRuntimeAdapter      | `chrome.runtime.openOptionsPage`            |
| `onInstalled(handler)`                | IRuntimeAdapter      | `chrome.runtime.onInstalled.addListener`    |
| `showNotification(id, msg)`           | INotificationAdapter | `chrome.notifications.create`               |
| `clearNotification(id)`               | INotificationAdapter | `chrome.notifications.clear`                |
| `onCommand(handler)`                  | ICommandAdapter      | `chrome.commands.onCommand.addListener`     |
| `createContextMenu(options)`          | IContextMenuAdapter  | `chrome.contextMenus.create`                |
| `removeContextMenu(id)`               | IContextMenuAdapter  | `chrome.contextMenus.remove`                |
| `onContextMenuClick(handler)`         | IContextMenuAdapter  | `chrome.contextMenus.onClicked.addListener` |
| `setBadgeText(text, tabId?)`          | IActionAdapter       | `chrome.action.setBadgeText`                |
| `setBadgeColor(color)`                | IActionAdapter       | `chrome.action.setBadgeBackgroundColor`     |
| `setIcon(path)`                       | IActionAdapter       | `chrome.action.setIcon`                     |
| `openPopup()`                         | IActionAdapter       | `chrome.action.openPopup`                   |
| `openSidePanel(tabId)`                | ISidePanelAdapter    | `chrome.sidePanel.open`                     |
| `setSidePanelEnabled(tabId, enabled)` | ISidePanelAdapter    | `chrome.sidePanel.setOptions`               |
| `writeText(text)`                     | IClipboardAdapter    | `navigator.clipboard.writeText`             |
| `readText()`                          | IClipboardAdapter    | `navigator.clipboard.readText`              |

---

## `src/infrastructure/fsa/fsa.ts`

File System Access API — the only file that uses FSA directly.

| Name                                              | Kind     | Description                                                                                                                                                                                                        |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConflictStrategy`                                | Enum     | `Overwrite \| Skip \| Suffix` — strategy when a target file already exists. `Suffix` appends `-1` before the extension; `Skip` returns the existing filename without writing.                                      |
| `PermissionDeniedError`                           | Class    | Thrown by `saveTo` when `readwrite` permission cannot be obtained. Message: `Permission denied for directory "<name>"`.                                                                                            |
| `ensureWritable(handle)`                          | Function | Queries and (if needed) requests `readwrite` permission on a `FileSystemDirectoryHandle`. Returns `true` when granted.                                                                                             |
| `saveTo(dirHandle, fileName, content, strategy?)` | Function | Writes `content` to `fileName` in `dirHandle`, applying the chosen `ConflictStrategy` (default: `Suffix`). Returns the actual filename written. Throws `PermissionDeniedError` when the directory is not writable. |

---

## `src/infrastructure/storage/destinations.ts`

IndexedDB-backed destination storage — the only file that uses IndexedDB for destinations.

| Name                             | Kind      | Description                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Destination`                    | Interface | A persisted FSA destination: `id` (UUID), `label`, `dirHandle` (FileSystemDirectoryHandle), `fileNamePattern`, `createdAt` (Unix ms).                                                                                                                                                             |
| `IDestinationStorage`            | Interface | CRUD facade: `add(label, dirHandle, fileNamePattern?)`, `getAll()`, `getById(id)`, `update(id, changes)`, `remove(id)`. All async.                                                                                                                                                                |
| `createDestinationStorage(idb?)` | Function  | Opens (and creates if needed) the `web-harvester` IndexedDB database at version 1 with a `destinations` object store, then returns an `IDestinationStorage` facade. Accepts an optional `IDBFactory` injection point for tests (supply `fake-indexeddb`). Returns `Promise<IDestinationStorage>`. |

---

## `src/infrastructure/storage/settings.ts`

`chrome.storage.local`-backed settings storage with Zod validation and a versioned migration runner.

| Name                             | Kind      | Description                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMigration`                     | Interface | A single migration step: `version: number`, `description: string`, `up: (data: unknown) => unknown`. The `up` function must be pure (no side effects, no async, no storage calls).                                                                                                                                                                                                                  |
| `createSettingsStorage(adapter)` | Function  | Builds a settings storage facade over an `IStorageAdapter`. Returns an object with: `get<T>(schema)` (Zod-validated read, falls back to defaults on schema failure), `set<T>(key, value)` (merge-write), `backup(version)` (explicit snapshot), `getBackup(version)` (retrieve snapshot), `runMigrations(migrations)` (apply pending migrations in order, with per-step backup/restore on failure). |
