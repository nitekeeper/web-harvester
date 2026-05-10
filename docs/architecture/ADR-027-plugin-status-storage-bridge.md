# ADR-027 — Plugin Status Storage Bridge

## Context

The settings page needs to display the lifecycle state of every registered plugin. Plugins are
activated in the background service worker; the settings page is a separate document with no direct
reference to the registry object.

Three patterns were considered:

1. **Message request/response** — settings page sends `MSG_QUERY_PLUGINS`; background responds.
   Simple for a one-shot read, but MV3 service workers can restart between the response and any
   subsequent update, leaving the page stale.

2. **`chrome.runtime.connect` long-lived port** — allows push updates, but MV3 terminates ports
   when the service worker sleeps, requiring reconnect logic and adding meaningful complexity.

3. **`chrome.storage.local` as a shared bus** — background writes after activation; settings page
   reads on mount and subscribes to `onChanged`. MV3-safe: storage persists across service-worker
   restarts; the settings page always reads the last known state.

## Decision

Use `chrome.storage.local` under the key `wh_plugin_status` (constant in `@shared/pluginStatus`).

- Background writes `PluginStatusPayload` once, immediately after `registry.activateAll()`.
- Settings entry point reads the key on init and calls `adapter.onChanged` to receive future writes
  (e.g. after a service-worker restart re-activates plugins).
- Both writer and reader import only from `@shared` — no cross-context import of `@core`.

## Consequences

- Plugin state is eventually consistent: there is a window between page open and the background
  write landing where the settings page shows the empty state. In practice this is sub-second.
- If the background never writes (e.g. extension freshly installed, no stored state yet), the page
  correctly shows the empty state.
- Adding push updates (e.g. failed activation after hot-reload) requires only that the background
  calls `adapter.setLocal(PLUGIN_STATUS_STORAGE_KEY, ...)` again — no protocol change on the
  settings side.
