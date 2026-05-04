# ADR-012: Scoped Context Logger

**Status:** Accepted  
**Date:** 2026-05-02

## Context

An extension runs code across multiple isolated contexts (background SW, popup, settings, content script), and each plugin within those contexts produces its own log output. Without scoped logging, log messages are anonymous and impossible to attribute to their source during debugging. The project also enforces a hard rule against `console.log` in production code — raw console calls produce noise in production and cannot be selectively suppressed. A logger abstraction provides the suppression point.

## Decision

`createLogger(context, options?)` in `src/shared/logger.ts` returns a `Logger` with four levels (`debug`, `info`, `warn`, `error`). Every message is prefixed with `[context]` so the source is immediately visible in the DevTools console. In production (`NODE_ENV === 'production'` or `options.production: true`), `debug` and `info` are suppressed; `warn` and `error` are always emitted. The `ILogger` interface in `src/domain/types.ts` mirrors this shape so domain code can accept a logger without importing from `shared/`.

The `createLogger` factory is called once per feature/module at module load time (e.g. `createLogger('hook-system')`, `createLogger('plugin-registry')`), not per request, keeping the per-call overhead to a single prefix prepend.

## Consequences

Log output in development is self-attributing — every line identifies its source context. Production builds suppress the high-volume `debug`/`info` calls without requiring any code changes. The `ILogger` interface allows domain code and plugins to be tested with a mock logger. The design doc describes forwarding `warn`/`error` from content scripts and popups to the background SW via `IRuntimeAdapter.sendMessage` for central storage and the debug panel — this forwarding layer is not yet implemented but the interface is compatible with it.
