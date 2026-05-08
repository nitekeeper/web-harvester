# ADR-025: Highlight Feature — Content Script Ownership

**Date:** 2026-05-08  
**Status:** Accepted

## Context

Highlight persistence could be routed per-highlight via IPC (popup → background → `onHighlight` hook → `HighlightService` → storage) or written directly from the content script to `chrome.storage.local` (content script → storage, background reads at clip time).

The original design used the hook path. This caused: (a) a circular recursion — `HighlightService.addHighlight()` fired `onHighlight`, which called `HighlighterPlugin.onHighlight` tap, which called `addHighlight()` again; (b) the popup button was wired to NOOP; (c) no IPC pathway existed to start/stop the content script's highlight mode; (d) `HighlighterPlugin` wrote to a UI slot registry that nothing reads.

## Decision

The content script owns state and writes directly to `chrome.storage.local`. The background is a forwarder (start/stop) and a reader (clip time via `HighlightService.getHighlightsForUrl`).

- Shared types (`AnyHighlightData`, `normalizeUrl`, `getElementXPath`) move to `src/shared/` so the content script (presentation layer) can import them without layer violations.
- `HighlightService.addHighlight()` no longer calls `onHighlight` hook — it is not in the active persistence path.
- `HighlighterPlugin` keeps only the `beforeClip` tap; `onHighlight` tap and `ui.addToSlot` are removed.
- New `MSG_START_HIGHLIGHT`/`MSG_STOP_HIGHLIGHT` messages route through the background to the content script.
- The `isHighlightActive` state in `usePopupStore` is the single source of truth for the UI button state.

## Consequences

- No per-highlight IPC round-trip. Highlights are saved directly on mouseup.
- `HighlightService.getHighlightsForUrl()` reads `AnyHighlightData[]` (content script format) and maps to `Highlight[]` via the pre-extracted `text` field.
- Plugins that need per-highlight reactions can tap `chrome.storage.onChanged` instead of the hook.
- The `onHighlight` hook is retained in the domain types for API completeness but is no longer used in the active path.
