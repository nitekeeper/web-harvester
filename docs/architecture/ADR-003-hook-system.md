# ADR-003: Custom TypeScript-First Hook System

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Plugins need a way to intercept and modify data flowing through the system (e.g. transforming clip content before saving), cancel operations (e.g. blocking a save when validation fails), and subscribe to lifecycle events (e.g. reacting to settings changes). Using direct function calls would couple plugins to one another. Using a generic event emitter would lose type safety on payload shapes. An existing library like webpack's Tapable was considered but brings a CommonJS-era API surface that conflicts with the project's ESM-first, TypeScript-strict requirements.

## Decision

A custom hook system is implemented in `src/core/hooks.ts` with four distinct hook types, each serving a different inter-plugin communication pattern:

- `AsyncWaterfallHook<T>` — value passes through each handler sequentially; each handler may transform it (e.g. `beforeClip`, `onTemplateRender`)
- `AsyncBailHook<T>` — stops the chain early if any handler returns `false` (e.g. `beforeSave`)
- `AsyncEventHook<T>` — fire-and-forget; all handlers run concurrently via `Promise.all` (e.g. `afterClip`, `afterSave`)
- `SyncEventHook<T>` — synchronous fire-and-forget for UI events where async would cause visible latency (e.g. `onThemeChanged`, `onPopupOpen`)

All hooks share three built-in guarantees: each handler is wrapped in try/catch so a failing handler logs and continues; handlers support optional `priority` (default 0, higher runs first); and handlers are deduplicated by `id` so re-registering with the same id replaces the prior entry.

## Consequences

Every hook is fully typed at the call site — payload shape mismatches are caught at compile time. The four hook types make inter-plugin contracts explicit: a waterfall is a transformation pipeline, a bail is a gated check, an event is a notification. The system is pure TypeScript with no external dependencies. The tradeoff is that debugging a chain of waterfall handlers is less visual than a traditional event system, and the priority mechanism requires understanding that higher numbers run first.
