# ADR-019: Typed Domain Hook System and Dual Tap Signatures

**Status:** Accepted  
**Date:** 2026-05-03

---

## Context

`IHookSystem` was originally declared in `@domain/types` as an opaque
placeholder (`Readonly<Record<string, unknown>>`) while the concrete hook map
lived in `@core/hooks`. Application services that needed to call a specific
hook had to mirror a slice of the core interface locally (see ADR-017),
because:

1. `application/` cannot import from `@core/`.
2. The placeholder domain interface exposed each hook as `unknown`, so calls
   would not typecheck without a local mirror.

When Phase 8 plugin work began, this gap surfaced again — `IPluginContext.hooks`
was typed as the placeholder, so plugins had no way to call `hooks.onThemeChanged`
or subscribe to `hooks.beforeClip` with full type safety. The plugin-facing API
also wanted a more ergonomic `tap(fn)` form that returns an unsubscribe
function, while existing core code (and existing core tests) relies on the
older `tap(id, handler, options?)` form for named-tap dedup, priorities, and
explicit `untap(id)` removal.

We had three options:

1. **Keep the placeholder; let plugins import core.** Violates the layer rule
   (`plugins/` cannot import from `infrastructure/`, and `core/` is a peer
   layer that contains concrete dispatch logic — bringing it into plugins
   undermines the whole micro-kernel separation).
2. **Replace the legacy `tap(id, handler)` API entirely.** Forces a sweeping
   rewrite of existing core hook tests and any future internal plumbing that
   relies on named taps with priorities.
3. **Define a structural minimum in domain; overload core's `tap`.** Plugins
   consume the structural interface; core's concrete classes structurally
   satisfy it via an extra overload that returns an unsubscribe function.

---

## Decision

### Domain owns the hook payload data types

`ClipContent`, `HighlightEvent`, `Settings`, and `ThemePreset` now live in
`@domain/types`. Both `@core/hooks` and any plugin-facing code import them
from there. `@core/hooks` re-exports them so the existing `import { ClipContent }
from '@core/hooks'` pattern in core code keeps working.

### Domain defines minimal structural hook interfaces

```typescript
interface IWaterfallHook<T> {
  tap(fn: (value: T) => T | undefined): () => void;
  tapAsync(fn: (value: T) => Promise<T | undefined>): () => void;
  call(value: T): Promise<T>;
}
interface IEventHook<T> {
  tap(fn: (value: T) => void): () => void;
  tapAsync(fn: (value: T) => Promise<void>): () => void;
  call(value: T): Promise<void>;
}
interface ISyncEventHook<T> {
  tap(fn: (value: T) => void): () => void;
  call(value: T): void;
}
```

`IHookSystem` exposes the plugin-facing slice: `beforeClip`, `onClip`,
`onHighlight`, `onSettingsChanged`, `onThemeChanged`, `onTemplateRender`. This
is the surface plugins typecheck against.

### Core extends with `CoreHookSystem` and dual `tap` overloads

`@core/hooks` exports a richer `CoreHookSystem extends IHookSystem` that
includes implementation-only hooks (`afterClip`, `beforeSave`, `afterSave`,
`onPopupOpen`, plugin lifecycle events). Each async hook has overloaded `tap`:

```typescript
// Legacy (named, ordered, untap-by-id):
tap(id: string, handler: H, options?: TapOptions): void;
// Domain form (anonymous, returns unsubscribe):
tap(fn: F): () => void;
```

Internally, the domain form mints an anonymous id and converts the unsubscribe
into a `removeTap(id)` call so legacy and domain taps share the same storage
and execution path.

### `createMockContext` returns the concrete `CoreHookSystem`

Plugin tests call `createMockContext()` and receive an `IPluginContext` whose
`hooks` field is the real `createHookSystem()`. Because `CoreHookSystem`
structurally extends `IHookSystem`, the typecheck passes; because it includes
the real dispatch logic, the test can call `ctx.hooks.onThemeChanged.call(...)`
to drive plugin behaviour without a separate mock implementation.

---

## Consequences

**Positive**

- Plugins can `tap(fn)` and receive an unsubscribe function — closer to modern
  observable APIs.
- The plugin-facing `IHookSystem` is fully typed: `hooks.beforeClip.call(content)`
  typechecks with the domain `ClipContent` shape.
- No layer violations: plugins import `IHookSystem` from `@domain/types`, the
  concrete implementation stays in `@core/hooks`.
- Existing core hook tests (`tap(id, handler)`) continue to work unchanged —
  the legacy overload is preserved.

**Negative**

- The domain-form `tap(fn)` discards the registration id, so callers cannot
  later `untap(id)` — they must keep the returned unsubscribe handle. This is
  intentional (it's the modern shape) but is a behavioural change from the
  legacy form.
- The polymorphic `tap` body has a type-narrowing branch (`typeof idOrFn ===
'string' && handler`). A small runtime cost and a small readability cost in
  exchange for one API supporting both call shapes.
- `ClipContent` and `HighlightEvent` shapes in domain differ from the
  application-layer mirrors (`@application/ClipService.ClipContent`). Application
  services keep their local mirrors per ADR-017 — this is by design (the
  application port is its own contract independent of the hook payload shape),
  but readers must be aware of the shape divergence.
- The `IHookSystem` in domain exposes a strict subset of `CoreHookSystem`
  (no `afterClip`, `beforeSave`, etc.). When plugins genuinely need an
  implementation-only hook, that hook must first be promoted into the domain
  interface — a deliberate friction step that gates new public API.

---

## Alternatives Considered

- **Single unified `tap(fn): () => void` API.** Rejected: requires migrating
  all existing core hook tests and any future internal code that benefits from
  named taps and priorities. The legacy form is genuinely useful for the
  registry/lifecycle plumbing.
- **A separate `PluginHookSystem` interface adapter that wraps each core
  hook.** Rejected: doubles the dispatch object footprint (one wrapper per
  hook, allocated per plugin context) and adds an indirection layer that
  serves no purpose given that core's hooks already structurally satisfy the
  domain interface via the overload.
- **Re-export `CoreHookSystem` from domain.** Rejected: puts implementation
  detail (named taps, priorities, plugin lifecycle hooks) into the domain
  surface that plugins depend on, blurring the boundary the domain interface
  is meant to enforce.
