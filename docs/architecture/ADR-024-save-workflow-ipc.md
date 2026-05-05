# ADR-024 — Save Workflow IPC via chrome.runtime.sendMessage

**Date:** 2026-05-04
**Status:** Accepted

## Context

The popup and side-panel UI pages run in isolated extension contexts and cannot directly call
`ClipService.clip()`, which lives in the background service worker. Cross-context invocation
requires the Chrome extension messaging API.

Three options were considered:

1. **Request-response** — `chrome.runtime.sendMessage` with a typed response via `sendResponse`.
2. **Fire-and-forget + storage broadcast** — popup sends message, background writes result to
   `chrome.storage.local`, popup's `onChanged` listener picks it up.
3. **Two-phase messaging** — popup sends, background sends a second message back via
   `chrome.tabs.sendMessage`.

## Decision

Use **request-response** (`chrome.runtime.sendMessage` / `chrome.runtime.onMessage`).

A typed contract is defined in `src/shared/messages.ts` (`ClipPageMessage`, `ClipPageResponse`,
`isClipPageMessage`). The background registers one `onMessage` handler per message type via
`wireMessageListener`. Popup/side-panel call `adapter.sendMessage()` and await the response to
drive UI state transitions in the popup store.

## Consequences

- **Simple and testable.** No polling, no extra storage keys, no second message channel.
- **Background resolves the active tab.** Same as keyboard commands and context menus — single
  source of truth.
- **File survives popup close.** If the popup closes before `sendResponse` fires, the clip still
  completes and the Chrome notification still appears. The `saveStatus` UI state is simply lost
  (acceptable — the file was saved).
- **One handler per message type.** Non-clip messages (e.g. the content-script `getHtml`
  exchange) pass through the `isClipPageMessage` guard unchanged.
- **No `IRuntimeAdapter` change.** `sendMessage(msg: unknown)` and `onMessage(handler)` already
  satisfy the contract. The typed wrapper lives entirely in `shared/` and the call sites.
