import type { Container } from 'inversify';
import type React from 'react';

import type { Logger } from '@shared/logger';

// ---------------------------------------------------------------------------
// Domain data types used by the hook system and plugins
// ---------------------------------------------------------------------------

/** Content captured from a web page, used for clip annotation. */
export interface ClipContent {
  title: string;
  url: string;
  body: string;
  selectedText: string;
  highlights?: string;
  /** Pre-extracted article markdown from the content script, avoiding service-worker DOMParser limits. */
  markdown?: string;
  /** ID of the template to apply during the clip/preview flow. When absent, the plugin falls back to the default template. */
  selectedTemplateId?: string;
}

/** Event emitted when the user creates or modifies a highlight. */
export interface HighlightEvent {
  id: string;
  url: string;
  text: string;
  xpath: string;
  color: string;
}

/** Opaque key/value map of application settings persisted by SettingsPlugin. */
export type Settings = Record<string, unknown>;

/** A theme preset with optional CSS custom-property tokens. */
export interface ThemePreset {
  id: string;
  name: string;
  base: 'light' | 'dark';
  tokens: Record<string, string>;
  isCustom: boolean;
}

// ---------------------------------------------------------------------------
// Hook system — minimal structural interfaces for plugin consumption.
// Concrete implementations live in `@core/hooks` and may expose a richer
// `tap(id, handler)` overload alongside the structural `tap(fn)` form below.
// ---------------------------------------------------------------------------

/** Minimal contract for a waterfall hook (async transform chain). */
export interface IWaterfallHook<T> {
  tap(fn: (value: T) => T | undefined): () => void;
  tapAsync(fn: (value: T) => Promise<T | undefined>): () => void;
  call(value: T): Promise<T>;
}

/** Minimal contract for an async event hook (fire-and-forget notification). */
export interface IEventHook<T> {
  tap(fn: (value: T) => void): () => void;
  tapAsync(fn: (value: T) => Promise<void>): () => void;
  call(value: T): Promise<void>;
}

/** Minimal contract for a sync event hook. */
export interface ISyncEventHook<T> {
  tap(fn: (value: T) => void): () => void;
  call(value: T): void;
}

/**
 * Aggregate hook system available to plugins. Concrete hook implementations
 * live in `@core/hooks` but the structural shape exposed to plugins is fixed
 * here in the domain layer.
 */
export interface IHookSystem {
  readonly beforeClip: IWaterfallHook<ClipContent>;
  readonly onClip: IEventHook<ClipContent>;
  readonly onHighlight: IEventHook<HighlightEvent>;
  /** Fired after settings are persisted — notification only, do not re-persist in response. */
  readonly onSettingsChanged: IEventHook<Settings>;
  /** Fired when an external caller requests that settings be written to storage. */
  readonly onSaveSettings: IEventHook<Settings>;
  readonly onThemeChanged: ISyncEventHook<ThemePreset>;
  readonly onTemplateRender: IWaterfallHook<string>;
}

// ---------------------------------------------------------------------------
// Plugin system
// ---------------------------------------------------------------------------

/**
 * Static metadata describing a plugin: identity, dependencies, required
 * adapters, requested permissions, and an optional settings schema.
 */
export interface IPluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly dependencies?: readonly string[];
  readonly requiredAdapters?: readonly symbol[];
  readonly permissions?: readonly string[];
  readonly settingsSchema?: IPluginSchema;
}

/**
 * Versioned settings schema for a plugin, with migrations from each prior
 * version to the next.
 */
export interface IPluginSchema {
  readonly version: number;
  readonly migrations: Readonly<Record<number, (oldState: unknown) => unknown>>;
}

/**
 * Per-plugin key/value storage adapter scoped to a single plugin instance.
 */
export interface IPluginStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Scoped logger interface used by plugins and core services.
 *
 * Type alias of `Logger` from `@shared/logger` so there is one source of
 * truth for the logger contract across layers.
 */
export type ILogger = Logger;

// ---------------------------------------------------------------------------
// UI system
// ---------------------------------------------------------------------------

/**
 * Named extension points where plugins may contribute UI components.
 */
export type UISlot =
  | 'popup-toolbar'
  | 'popup-properties'
  | 'popup-footer'
  | 'settings-section'
  | 'settings-nav';

/**
 * Top-level UI surfaces that host plugin slots.
 */
export type UIContext = 'popup' | 'settings' | 'side-panel';

/**
 * A renderable component contribution with stable id and ordering priority.
 */
export interface IUIComponent {
  readonly id: string;
  readonly component: React.ComponentType;
  readonly priority: number;
}

/**
 * A slot contribution that references a component by name (resolved lazily by
 * the host UI). Used by plugins that want to register UI without holding a
 * direct reference to the React component at activation time.
 */
export interface ISlotEntry {
  readonly component: string;
  readonly order?: number;
  readonly props?: Record<string, unknown>;
  readonly onClick?: () => Promise<void> | void;
}

/**
 * Registry that plugins use to contribute components, slot entries, and
 * theme tokens to the host UI.
 */
export interface IUIRegistry {
  addToSlot(slot: UISlot, entry: ISlotEntry, contexts?: UIContext[]): void;
  registerComponent(id: string, component: React.ComponentType): void;
  getComponent(id: string): React.ComponentType | undefined;
  registerThemeTokens(tokens: Record<string, string>): void;
}

// ---------------------------------------------------------------------------
// Plugin context and plugin contract
// ---------------------------------------------------------------------------

/**
 * Runtime services injected into a plugin during activation.
 */
export interface IPluginContext {
  readonly hooks: IHookSystem;
  readonly container: Container;
  readonly logger: ILogger;
  readonly storage: IPluginStorage;
  readonly ui: IUIRegistry;
}

/**
 * Contract every plugin must implement: a manifest plus activate/deactivate
 * lifecycle hooks invoked by the plugin host.
 */
export interface IPlugin {
  readonly manifest: IPluginManifest;
  activate(context: IPluginContext): Promise<void>;
  deactivate(): Promise<void>;
}
