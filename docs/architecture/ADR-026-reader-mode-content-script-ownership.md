# ADR-026: Reader Mode — Content Script Ownership

**Date:** 2026-05-08  
**Status:** Accepted

## Context

Reader mode rendering could run in the background service worker (injecting CSS via `chrome.tabs.insertCSS`) or in the content script (replacing the DOM directly). The original design used `insertCSS`/`removeCSS` via `ITabAdapter`, which meant:

- Only CSS was injected — the page body was never replaced with the extracted Defuddle content.
- `ReaderService` held references to `ITabAdapter.insertCSS`/`removeCSS`, coupling the service to a tab API not needed at clip time.
- Reader settings (font, theme) could not be applied dynamically because the injected CSS was a static string computed at toggle time.

## Decision

The content script owns the full reader mode lifecycle. `activateReader(settings)` runs in the content script: it calls `defuddleExtract` to obtain article HTML, saves and strips existing page stylesheets, replaces `document.body` with a clean `#wh-reader-content` shell, injects `<style id="wh-reader-style">` with `generateReaderCSS(settings)` output, and sets CSS custom properties on `documentElement`. `deactivateReader()` reverses everything.

The background service worker is a forwarder only: `ReaderService.toggle()` sends `READER_ACTIVATE` (with `ReaderSettings` payload) or `READER_DEACTIVATE` to the active tab via `sendMessageToTab`. `IReaderTabAdapterPort` is simplified to `{ sendMessageToTab }` — `insertCSS` and `removeCSS` are removed.

## Consequences

- Article content is actually displayed (body replacement rather than CSS overlay).
- `ReaderSettings` travels with the activation message so themes and typography are applied immediately without a second round-trip.
- `ReaderService` no longer needs `insertCSS`/`removeCSS` — the port contract is smaller.
- Reader mode deactivation restores the original DOM exactly (saved `innerHTML` + saved stylesheet references).
- The content script must be loaded on the page before `READER_ACTIVATE` is processed — the existing MV3 content script injection handles this.
