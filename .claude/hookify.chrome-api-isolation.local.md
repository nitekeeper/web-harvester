---
name: chrome-api-isolation
enabled: true
event: file
conditions:
  - field: file_path
    operator: not_contains
    pattern: ChromeAdapter
  - field: new_text
    operator: regex_match
    pattern: chrome\.(tabs|storage|runtime|windows|action|scripting|contextMenus|alarms|notifications|identity|permissions|downloads|history|bookmarks|cookies|webRequest|declarativeNetRequest|offscreen|sidePanel|commands)\b
action: block
---

🚫 **chrome.* API used outside ChromeAdapter — ARCHITECTURE VIOLATION**

`chrome.*` APIs are ONLY permitted inside:
`src/infrastructure/adapters/chrome/ChromeAdapter.ts`

No other file may touch `chrome.*` directly.

**Fix:** Use the appropriate adapter interface instead:
- `ITabAdapter` for tab operations
- `IStorageAdapter` for storage operations
- `IRuntimeAdapter` for runtime/messaging
- `IWindowAdapter` for window management
- etc.

Inject the interface via InversifyJS DI, never call chrome.* directly.
