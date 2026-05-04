# Logger API

## Overview

The logger is a thin scoped wrapper over the browser console. Every module that needs structured
logging creates its own scoped instance via `createLogger`, which prefixes all output with the
context name. In production mode (or when `NODE_ENV === 'production'`), `debug` and `info`
messages are suppressed; `warn` and `error` always write to the console.

## Interface

### `createLogger(context: string, options?: LoggerOptions): Logger`

```typescript
function createLogger(context: string, options?: LoggerOptions): Logger;
```

Creates a scoped logger. All messages emitted by the returned instance are prefixed with
`[context]`.

`options.production` overrides automatic environment detection. When omitted, `debug` and `info`
are suppressed whenever `process.env.NODE_ENV === 'production'` (or when `process` is not
defined, as in a plain browser context without bundler env injection).

---

### `Logger`

```typescript
interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}
```

| Method  | Console target  | Suppressed in production? |
| ------- | --------------- | ------------------------- |
| `debug` | `console.debug` | Yes                       |
| `info`  | `console.info`  | Yes                       |
| `warn`  | `console.warn`  | No                        |
| `error` | `console.error` | No                        |

---

### `LoggerOptions`

```typescript
interface LoggerOptions {
  production?: boolean; // default: inferred from NODE_ENV
}
```

## Usage Example

```typescript
import { createLogger } from '@shared/logger';

// Module-level scoped logger
const logger = createLogger('my-plugin');

logger.debug('processing item', { id: 42 });
logger.info('item processed');
logger.warn('quota low', { remaining: 10 });
logger.error('save failed', new Error('disk full'));

// Force production mode in a specific context (e.g. a background worker)
const prodLogger = createLogger('background', { production: true });
prodLogger.debug('this will be suppressed');
prodLogger.error('this will always appear');
```

## Notes

- Create one logger per module or logical subsystem. The `context` string appears verbatim in
  every console line, so keep it short and descriptive (e.g. `'fsa'`, `'plugin-registry'`,
  `'settings-storage'`).
- Do not use `console.log`, `console.debug`, etc. directly in production code — always route
  through a scoped logger.
- The `data` / `error` second argument is passed as a separate argument to the underlying
  `console.*` method, so browser devtools can expand objects interactively.
- Production mode is determined once at logger creation time. The check is not reactive to
  runtime `NODE_ENV` changes.
