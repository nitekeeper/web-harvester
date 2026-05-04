export type {
  IHookSystem,
  IPlugin,
  IPluginContext,
  IPluginManifest,
  IPluginSchema,
  IPluginStorage,
  ILogger,
  IUIComponent,
  IUIRegistry,
  UIContext,
  UISlot,
} from '@domain/types';

// Cross-cutting utility types

/**
 * Discriminated-union result type for fallible operations: either an `ok`
 * value or an `error`.
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Optional value that is either present or `undefined`.
 */
export type Maybe<T> = T | undefined;
