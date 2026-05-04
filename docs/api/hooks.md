# Hook System API

## Overview

The hook system is the primary extension point for inter-plugin communication. It provides four
hook types — waterfall, bail, async event, and sync event — each suited to a different interaction
pattern. The full `CoreHookSystem` object exposes the named hooks covering the clip, save, highlight,
settings, theme, and plugin lifecycle events. Plugins receive a hook system instance via
`IPluginContext.hooks` at activation time, typed as `IHookSystem` from `@domain/types` (a structural
subset of `CoreHookSystem`).

The async hook variants now expose two `tap` overloads:

- **Legacy form** — `tap(id: string, handler, options?)` returns void. Used inside `core/`/internal
  code where named taps and priorities matter.
- **Domain form** — `tap(fn)` returns an unsubscribe `() => void`. Preferred by plugins.

Hook payload data types (`ClipContent`, `HighlightEvent`, `Settings`, `ThemePreset`) live in
`@domain/types` so they can flow through the domain `IHookSystem` interface; `@core/hooks`
re-exports them for convenience.

## Interface

### `createHookSystem(): IHookSystem`

Creates the full hook system. Called once at extension startup and the result is passed into the
root DI container. Plugins should not call this directly — they receive an `IHookSystem` through
`IPluginContext`.

---

### `CoreHookSystem` — named hooks

| Hook                 | Type                              | Payload                                           |
| -------------------- | --------------------------------- | ------------------------------------------------- |
| `beforeClip`         | `AsyncWaterfallHook<ClipContent>` | `{ title, url, body, selectedText, highlights? }` |
| `onClip`             | `AsyncEventHook<ClipContent>`     | `{ title, url, body, selectedText, highlights? }` |
| `afterClip`          | `AsyncEventHook<ClipResult>`      | `{ fileName, destination }`                       |
| `beforeSave`         | `AsyncBailHook<SaveRequest>`      | `{ content, fileName, destinationId }`            |
| `afterSave`          | `AsyncEventHook<SaveResult>`      | `{ filePath }`                                    |
| `onTemplateRender`   | `AsyncWaterfallHook<string>`      | rendered output string                            |
| `onHighlight`        | `AsyncEventHook<HighlightEvent>`  | `{ id, url, text, xpath, color }`                 |
| `onSettingsChanged`  | `AsyncEventHook<Settings>`        | `Record<string, unknown>`                         |
| `onThemeChanged`     | `SyncEventHook<ThemePreset>`      | `{ id, name, base, tokens, isCustom }`            |
| `onPopupOpen`        | `SyncEventHook<undefined>`        | `undefined`                                       |
| `onPluginActivate`   | `AsyncEventHook<string>`          | plugin id                                         |
| `onPluginDeactivate` | `AsyncEventHook<string>`          | plugin id                                         |

---

### `AsyncWaterfallHook<T>`

Each registered handler receives the current value and returns a (possibly transformed) value.
Handlers run sequentially in descending `priority` order. The final value after all handlers is
returned from `call`.

```typescript
// Legacy form (used inside core/):
tap(id: string, handler: (value: T) => Promise<T>, options?: TapOptions): void
// Domain form (preferred for plugins):
tap(fn: (value: T) => T | undefined): () => void          // unsubscribe
tapAsync(fn: (value: T) => Promise<T | undefined>): () => void
call(value: T): Promise<T>
untap(id: string): void
```

Errors thrown inside a handler are caught and logged; the next handler receives the value as
returned by the previous successful handler.

---

### `AsyncBailHook<T>`

Handlers run sequentially in descending `priority` order. If any handler returns `false`, the
chain short-circuits and `call` resolves to `false`. Returning `undefined` (or any other value)
allows the chain to continue. `call` resolves to `true` when no handler bailed.

```typescript
tap(id: string, handler: (value: T) => Promise<false | undefined>, options?: TapOptions): void
call(value: T): Promise<boolean>
untap(id: string): void
```

A thrown error is caught and logged; the chain continues as if the handler returned `undefined`.

---

### `AsyncEventHook<T>`

All handlers run concurrently (`Promise.all`). Order is not guaranteed. `call` resolves once all
handlers settle.

```typescript
// Legacy form:
tap(id: string, handler: (value: T) => Promise<void>, options?: TapOptions): void
// Domain form:
tap(fn: (value: T) => void): () => void
tapAsync(fn: (value: T) => Promise<void>): () => void
call(value: T): Promise<void>
untap(id: string): void
```

Each handler's error is isolated — a throwing handler does not prevent others from running.

---

### `SyncEventHook<T>`

Handlers run synchronously in registration order. No `priority` option. `call` returns once all
handlers have been invoked.

```typescript
// Legacy form:
tap(id: string, handler: (value: T) => void): void
// Domain form:
tap(fn: (value: T) => void): () => void
call(value: T): void
untap(id: string): void
```

Errors are caught per handler and logged; subsequent handlers still run.

---

### `TapOptions`

```typescript
interface TapOptions {
  priority?: number; // default 0; higher values run first
}
```

---

### `createAsyncWaterfallHook<T>(): AsyncWaterfallHook<T>`

### `createAsyncBailHook<T>(): AsyncBailHook<T>`

### `createAsyncEventHook<T>(): AsyncEventHook<T>`

### `createSyncEventHook<T>(): SyncEventHook<T>`

Factory functions that return a new, empty hook of the given type. Used internally by
`createHookSystem`. Available for callers that need standalone hooks outside the named hook map.

## Usage Example

```typescript
import { createHookSystem } from '@core/hooks';

const hooks = createHookSystem();

// Intercept and transform clip content before saving
hooks.beforeClip.tap(
  'my-plugin',
  async (content) => {
    return { ...content, html: content.html.replace(/<script[^>]*>.*?<\/script>/gs, '') };
  },
  { priority: 10 },
);

// Observe saves without modifying the flow
hooks.afterSave.tap('my-plugin', async (result) => {
  console.log('saved to', result.filePath);
});

// Block saves conditionally
hooks.beforeSave.tap('quota-guard', async (request) => {
  if (await isStorageFull()) return false;
});

// Clean up on deactivation
plugin.deactivate = async () => {
  hooks.beforeClip.untap('my-plugin');
  hooks.afterSave.untap('my-plugin');
  hooks.beforeSave.untap('quota-guard');
};
```

## Notes

- Registering a tap with a duplicate `id` replaces the existing entry rather than adding a second.
- Calling `untap` with an unknown `id` is a no-op.
- `SyncEventHook` does not support `priority`; handlers fire in registration order only.
- All hook errors are caught and sent to the internal `hook-system` logger — they never propagate
  to the caller of `call`.
