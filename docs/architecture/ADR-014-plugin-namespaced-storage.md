# ADR-014: Namespaced Plugin Storage with Key Index

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Plugins need isolated key/value storage that cannot accidentally collide with other plugins' keys or with global settings. The storage must support a `clear()` operation for plugin uninstall that removes all of a plugin's entries without enumerating the entire storage (which would be expensive and could expose other plugins' keys). `chrome.storage.local` does not natively support namespacing or listing keys by prefix.

## Decision

`createPluginStorage(pluginId, adapter)` in `src/core/context.ts` returns an `IPluginStorage` that namespaces every key under `plugin:<pluginId>:`. A secondary index key `plugin:<pluginId>:__keys` is maintained alongside the data: every `set()` appends the logical key to the index if not already present, and every `remove()` removes it. `clear()` reads the index to enumerate all of the plugin's keys, removes each data entry, then removes the index itself — the entire operation touches only the plugin's own entries.

Plugins receive this storage object through `IPluginContext.storage` at activation time and never interact with `IStorageAdapter` directly.

## Consequences

Key collisions between plugins are impossible by construction. `clear()` on uninstall is O(n) in the plugin's own key count rather than O(total storage). The index is an extra write on every `set()` and `remove()` — this is acceptable given the low write frequency of plugin settings. The tradeoff is that the index can diverge from reality if storage writes fail mid-operation (e.g. `setLocal(data)` succeeds but `setLocal(index)` fails). This edge case is not currently guarded against, as extension storage writes are generally reliable and plugin settings are non-critical data.
