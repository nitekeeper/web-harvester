import type {
  ClipContent,
  HighlightEvent,
  IEventHook,
  IHookSystem,
  ISyncEventHook,
  IWaterfallHook,
  Settings,
  ThemePreset,
} from '@domain/types.js';
import { createLogger } from '@shared/logger';

const logger = createLogger('hook-system');

/** Options accepted when registering a tap on a hook. */
export interface TapOptions {
  readonly priority?: number;
}

/** Internal entry stored per registered tap, including its sort priority. */
interface TapEntry<H> {
  readonly id: string;
  readonly handler: H;
  readonly priority: number;
}

/** Counter used to mint unique anonymous tap ids when callers omit one. */
let anonymousTapCounter = 0;

/** Insert a tap entry and re-sort by priority (descending). Replaces any existing entry with the same id. */
function insertTap<H>(taps: TapEntry<H>[], entry: TapEntry<H>): void {
  const idx = taps.findIndex((t) => t.id === entry.id);
  if (idx !== -1) taps.splice(idx, 1); // dedup: remove existing entry with same id
  taps.push(entry);
  taps.sort((a, b) => b.priority - a.priority);
}

/** Remove a tap entry by id. No-op if not present. */
function removeTap<H>(taps: TapEntry<H>[], id: string): void {
  const index = taps.findIndex((t) => t.id === id);
  if (index !== -1) taps.splice(index, 1);
}

/** Mints a unique id for an anonymous (function-only) tap registration. */
function nextAnonymousTapId(prefix: string): string {
  anonymousTapCounter += 1;
  return `${prefix}-anon-${String(anonymousTapCounter)}`;
}

/**
 * Executes a list of waterfall taps sequentially, threading the value through
 * each handler and isolating per-handler errors so one failure does not
 * abort the chain.
 */
async function runWaterfall<T>(
  taps: ReadonlyArray<TapEntry<(value: T) => Promise<T>>>,
  initial: T,
  hookName: string,
): Promise<T> {
  let current = initial;
  for (const entry of taps) {
    try {
      current = await entry.handler(current);
    } catch (err) {
      logger.error(`${hookName} handler "${entry.id}" threw`, err);
    }
  }
  return current;
}

/**
 * Executes a list of async event taps concurrently with per-handler error
 * isolation. Resolves once all handlers have settled.
 */
async function runEventConcurrent<T>(
  taps: ReadonlyArray<TapEntry<(value: T) => Promise<void>>>,
  value: T,
  hookName: string,
): Promise<void> {
  await Promise.all(
    taps.map(async (entry) => {
      try {
        await entry.handler(value);
      } catch (err) {
        logger.error(`${hookName} handler "${entry.id}" threw`, err);
      }
    }),
  );
}

/**
 * Executes a list of sync event taps in registration order with per-handler
 * error isolation.
 */
function runSyncEvent<T>(
  taps: ReadonlyArray<{ id: string; handler: (value: T) => void }>,
  value: T,
  hookName: string,
): void {
  for (const entry of taps) {
    try {
      entry.handler(value);
    } catch (err) {
      logger.error(`${hookName} handler "${entry.id}" threw`, err);
    }
  }
}

/**
 * Internal helper that bundles the tap-registration shape shared by all async
 * hook factories: a priority-ordered `taps` array plus pre-bound `tap` and
 * `untap` methods. Each factory composes its own `call` semantics on top.
 */
function createTapList<H>(): {
  readonly taps: TapEntry<H>[];
  tap: (id: string, handler: H, options?: TapOptions) => void;
  untap: (id: string) => void;
} {
  const taps: TapEntry<H>[] = [];
  return {
    taps,
    tap(id, handler, options = {}) {
      insertTap(taps, { id, handler, priority: options.priority ?? 0 });
    },
    untap(id) {
      removeTap(taps, id);
    },
  };
}

/** Waterfall hook — each handler can transform the value. Errors are isolated. */
export interface AsyncWaterfallHook<T> extends IWaterfallHook<T> {
  /** Register a handler keyed by id, optionally with priority; returns void (legacy form). */
  tap(id: string, handler: (value: T) => Promise<T>, options?: TapOptions): void;
  /** Register an anonymous synchronous handler; returns an unsubscribe function (domain form). */
  tap(fn: (value: T) => T | undefined): () => void;
  /** Register an anonymous async handler; returns an unsubscribe function (domain form). */
  tapAsync(fn: (value: T) => Promise<T | undefined>): () => void;
  /** Execute all registered taps in priority order, returning the final value. */
  call(value: T): Promise<T>;
  /** Remove a previously registered tap by id. No-op if id is not found. */
  untap(id: string): void;
}

/**
 * Builds the polymorphic `tap` function shared by all hook variants. Returns
 * the dispatcher that supports both `tap(id, handler, options)` (legacy form,
 * returns `undefined`) and `tap(fn)` (domain form, returns an unsubscribe).
 */
function buildPolymorphicTap<L, A>(args: {
  legacyTap: (id: string, handler: L, options?: TapOptions) => void;
  registerAnonymous: (fn: A) => () => void;
  hookName: string;
}): (idOrFn: string | A, handler?: L, options?: TapOptions) => (() => void) | undefined {
  return (idOrFn, handler, options) => {
    if (typeof idOrFn === 'string' && handler) {
      args.legacyTap(idOrFn, handler, options);
      return undefined;
    }
    if (typeof idOrFn === 'function') {
      return args.registerAnonymous(idOrFn as unknown as A);
    }
    throw new TypeError(`${args.hookName}.tap: expected (id, handler) or (fn)`);
  };
}

/** Creates an AsyncWaterfallHook — handlers transform value sequentially. */
export function createAsyncWaterfallHook<T>(): AsyncWaterfallHook<T> {
  /** Async handler that receives the current value and returns the next one. */
  type Handler = (value: T) => Promise<T>;
  const { taps, tap: legacyTap, untap } = createTapList<Handler>();

  /** Anonymous-tap helper: registers a handler with a unique id and returns its unsubscribe. */
  function registerAnonymous(handler: Handler): () => void {
    const id = nextAnonymousTapId('waterfall');
    legacyTap(id, handler);
    return () => {
      untap(id);
    };
  }

  const tap = buildPolymorphicTap<Handler, (value: T) => T | undefined>({
    legacyTap,
    hookName: 'AsyncWaterfallHook',
    registerAnonymous: (fn) =>
      registerAnonymous(async (value) => {
        const result = fn(value);
        return result === undefined ? value : result;
      }),
  });

  function tapAsync(fn: (value: T) => Promise<T | undefined>): () => void {
    return registerAnonymous(async (value) => {
      const result = await fn(value);
      return result === undefined ? value : result;
    });
  }

  return {
    tap: tap as AsyncWaterfallHook<T>['tap'],
    tapAsync,
    untap,
    async call(initialValue) {
      return runWaterfall(taps, initialValue, 'AsyncWaterfallHook');
    },
  };
}

/** Bail hook — stops execution if any handler returns false. */
export interface AsyncBailHook<T> {
  /** Register a handler; returning `false` short-circuits the chain. */
  tap(id: string, handler: (value: T) => Promise<false | undefined>, options?: TapOptions): void;
  /** Execute taps in priority order; resolves to false if any tap bails. */
  call(value: T): Promise<boolean>;
  /** Remove a previously registered tap by id. No-op if id is not found. */
  untap(id: string): void;
}

/** Creates an AsyncBailHook — short-circuits on first handler returning false. */
export function createAsyncBailHook<T>(): AsyncBailHook<T> {
  /** Async handler that may return `false` to bail out of the chain. */
  type Handler = (value: T) => Promise<false | undefined>;
  const { taps, tap, untap } = createTapList<Handler>();

  return {
    tap,
    untap,
    async call(value) {
      for (const entry of taps) {
        try {
          if ((await entry.handler(value)) === false) return false;
        } catch (err) {
          logger.error(`AsyncBailHook handler "${entry.id}" threw`, err);
        }
      }
      return true;
    },
  };
}

/** Fire-and-forget async hook — handlers run concurrently, no value transformation. */
export interface AsyncEventHook<T> extends IEventHook<T> {
  /** Register a handler keyed by id; returns void (legacy form). */
  tap(id: string, handler: (value: T) => Promise<void>, options?: TapOptions): void;
  /** Register an anonymous sync handler; returns an unsubscribe function (domain form). */
  tap(fn: (value: T) => void): () => void;
  /** Register an anonymous async handler; returns an unsubscribe function (domain form). */
  tapAsync(fn: (value: T) => Promise<void>): () => void;
  /** Emit the event; resolves once all handlers settle. Errors are isolated per handler. */
  call(value: T): Promise<void>;
  /** Remove a previously registered tap by id. No-op if id is not found. */
  untap(id: string): void;
}

/** Creates an AsyncEventHook — fire-and-forget, all handlers run concurrently. */
export function createAsyncEventHook<T>(): AsyncEventHook<T> {
  /** Async handler that observes the value but does not transform it. */
  type Handler = (value: T) => Promise<void>;
  const { taps, tap: legacyTap, untap } = createTapList<Handler>();

  /** Anonymous-tap helper: registers a handler with a unique id and returns its unsubscribe. */
  function registerAnonymous(handler: Handler): () => void {
    const id = nextAnonymousTapId('event');
    legacyTap(id, handler);
    return () => {
      untap(id);
    };
  }

  const tap = buildPolymorphicTap<Handler, (value: T) => void>({
    legacyTap,
    hookName: 'AsyncEventHook',
    registerAnonymous: (fn) =>
      registerAnonymous(async (value) => {
        fn(value);
      }),
  });

  function tapAsync(fn: (value: T) => Promise<void>): () => void {
    return registerAnonymous(fn);
  }

  return {
    tap: tap as AsyncEventHook<T>['tap'],
    tapAsync,
    untap,
    async call(value) {
      await runEventConcurrent(taps, value, 'AsyncEventHook');
    },
  };
}

/** Synchronous fire-and-forget hook — handlers run sequentially in registration order. */
export interface SyncEventHook<T> extends ISyncEventHook<T> {
  /** Register a synchronous handler keyed by id; returns void (legacy form). */
  tap(id: string, handler: (value: T) => void): void;
  /** Register an anonymous synchronous handler; returns an unsubscribe function (domain form). */
  tap(fn: (value: T) => void): () => void;
  /** Emit the event synchronously; errors are caught per handler. */
  call(value: T): void;
  /** Remove a previously registered tap by id. No-op if id is not found. */
  untap(id: string): void;
}

/** Creates a SyncEventHook — synchronous, sequential handlers in registration order. */
export function createSyncEventHook<T>(): SyncEventHook<T> {
  /** Synchronous handler that observes the value but does not transform it. */
  type Handler = (value: T) => void;
  const taps: { id: string; handler: Handler }[] = [];

  function removeById(id: string): void {
    const idx = taps.findIndex((t) => t.id === id);
    if (idx !== -1) taps.splice(idx, 1);
  }

  function legacyTap(id: string, handler: Handler): void {
    removeById(id); // dedup: replace existing entry
    taps.push({ id, handler });
  }

  /** Anonymous-tap helper: registers a handler with a unique id and returns its unsubscribe. */
  function registerAnonymous(handler: Handler): () => void {
    const id = nextAnonymousTapId('sync');
    legacyTap(id, handler);
    return () => {
      removeById(id);
    };
  }

  const tap = buildPolymorphicTap<Handler, Handler>({
    legacyTap,
    hookName: 'SyncEventHook',
    registerAnonymous,
  });

  return {
    tap: tap as SyncEventHook<T>['tap'],
    call(value) {
      runSyncEvent(taps, value, 'SyncEventHook');
    },
    untap: removeById,
  };
}

// ---------------------------------------------------------------------------
// Hook payload types — application-specific, not part of the domain surface.
// (`ClipContent`, `HighlightEvent`, `Settings`, and `ThemePreset` live in
// `@domain/types` so they may flow through the domain `IHookSystem` interface.)
// ---------------------------------------------------------------------------

/** Result emitted after a clip operation completes. */
export interface ClipResult {
  readonly fileName: string;
  readonly destination: string;
}

/** Request to persist clipped content to a destination. */
export interface SaveRequest {
  readonly content: string;
  readonly fileName: string;
  readonly destinationId: string;
}

/** Result emitted after a save operation completes. */
export interface SaveResult {
  readonly filePath: string;
}

// ---------------------------------------------------------------------------
// Concrete hook system
// ---------------------------------------------------------------------------

/**
 * All named hooks available across the system. Extends the domain
 * `IHookSystem` with additional implementation-only hooks (`afterClip`,
 * `beforeSave`, `afterSave`, `onPopupOpen`, plugin lifecycle events) that are
 * not part of the plugin-facing contract.
 */
export interface CoreHookSystem extends IHookSystem {
  readonly beforeClip: AsyncWaterfallHook<ClipContent>;
  readonly onClip: AsyncEventHook<ClipContent>;
  readonly afterClip: AsyncEventHook<ClipResult>;
  readonly beforeSave: AsyncBailHook<SaveRequest>;
  readonly afterSave: AsyncEventHook<SaveResult>;
  readonly onTemplateRender: AsyncWaterfallHook<string>;
  readonly onHighlight: AsyncEventHook<HighlightEvent>;
  readonly onSettingsChanged: AsyncEventHook<Settings>;
  readonly onThemeChanged: SyncEventHook<ThemePreset>;
  readonly onPopupOpen: SyncEventHook<undefined>;
  readonly onPluginActivate: AsyncEventHook<string>;
  readonly onPluginDeactivate: AsyncEventHook<string>;
}

/** Creates the full hook system used across the app. */
export function createHookSystem(): CoreHookSystem {
  return {
    beforeClip: createAsyncWaterfallHook<ClipContent>(),
    onClip: createAsyncEventHook<ClipContent>(),
    afterClip: createAsyncEventHook<ClipResult>(),
    beforeSave: createAsyncBailHook<SaveRequest>(),
    afterSave: createAsyncEventHook<SaveResult>(),
    onTemplateRender: createAsyncWaterfallHook<string>(),
    onHighlight: createAsyncEventHook<HighlightEvent>(),
    onSettingsChanged: createAsyncEventHook<Settings>(),
    onThemeChanged: createSyncEventHook<ThemePreset>(),
    onPopupOpen: createSyncEventHook<undefined>(),
    onPluginActivate: createAsyncEventHook<string>(),
    onPluginDeactivate: createAsyncEventHook<string>(),
  };
}

// ---------------------------------------------------------------------------
// Re-exports of domain hook payload types for callers that want a single
// import surface from `@core/hooks`.
// ---------------------------------------------------------------------------

export type { ClipContent, HighlightEvent, Settings, ThemePreset } from '@domain/types.js';
