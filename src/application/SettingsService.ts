// src/application/SettingsService.ts
import { z } from 'zod';

import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';

// ── Schema ────────────────────────────────────────────────────────────────────

/**
 * Zod schema for the global application settings record persisted under the
 * `app_settings` storage key. All fields have defaults so an empty object
 * parses successfully.
 */
export const AppSettingsSchema = z.object({
  version: z.number().default(1),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  locale: z.string().default('en'),
  defaultDestinationId: z.string().optional(),
  conflictStrategy: z.enum(['overwrite', 'skip', 'suffix']).default('suffix'),
  customThemeTokens: z.record(z.string()).default({}),
  customThemes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        base: z.enum(['light', 'dark']),
        tokens: z.record(z.string()),
        isCustom: z.literal(true),
        createdAt: z.number(),
      }),
    )
    .default([]),
});

/** Inferred TypeScript type for the global application settings record. */
export type AppSettings = z.infer<typeof AppSettingsSchema>;

// ── Storage interface (subset used by this service) ───────────────────────────

/**
 * Minimal port the service needs from the settings storage adapter — a
 * key/value reader/writer plus a change subscription. Mirrors the public
 * surface of `createSettingsStorage` in `@infrastructure/storage` without
 * depending on the concrete implementation.
 */
export interface ISettingsStoragePort {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void;
}

// ── Hook port (subset used by this service) ───────────────────────────────────

/**
 * Local port describing the single hook this service emits. Defined here to
 * avoid a cross-layer dependency on `@core/hooks` while still providing a
 * typed `call()` signature (the placeholder `IHookSystem` in `@domain/types`
 * exposes hooks only as `unknown`).
 */
export interface ISettingsHooksPort {
  readonly onSettingsChanged: {
    call(value: AppSettings): Promise<void>;
  };
}

// ── Public interface ──────────────────────────────────────────────────────────

/** Public surface of the settings service — read, write, and subscribe. */
export interface ISettingsService {
  /** Reads the current settings, applying schema defaults for missing keys. */
  get(): Promise<AppSettings>;
  /** Updates a single setting key, persists, and notifies listeners + hook. */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  /** Registers a listener invoked with the full settings object after each set(). */
  onChange(handler: (settings: AppSettings) => void): void;
}

// ── Implementation ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'app_settings';

/**
 * Application service that reads and writes the global settings record with
 * Zod validation, fans out change events to local subscribers, and emits the
 * `onSettingsChanged` hook so plugins can react.
 */
export class SettingsService implements ISettingsService {
  private readonly changeHandlers: Array<(s: AppSettings) => void> = [];

  /**
   * @param storage - Settings storage port for persistence.
   * @param hooks - Hook port exposing `onSettingsChanged` for plugin notifications.
   * @param logger - Scoped logger; defaults to a `SettingsService`-scoped logger.
   */
  constructor(
    private readonly storage: ISettingsStoragePort,
    private readonly hooks: ISettingsHooksPort,
    private readonly logger: ILogger = createLogger('SettingsService'),
  ) {}

  /**
   * Reads the persisted settings record and validates it against the schema.
   * Missing or malformed records fall back to schema defaults so consumers
   * always receive a usable `AppSettings`.
   */
  async get(): Promise<AppSettings> {
    const raw = await this.storage.get(STORAGE_KEY);
    const parsed = AppSettingsSchema.safeParse(raw !== undefined && raw !== null ? raw : {});
    if (!parsed.success) {
      this.logger.warn('Settings failed validation — using defaults', {
        error: parsed.error.message,
      });
      return AppSettingsSchema.parse({});
    }
    return parsed.data;
  }

  /**
   * Updates a single setting key and persists the merged result. After
   * persisting, all `onChange` subscribers are invoked synchronously with the
   * new settings, then the `onSettingsChanged` hook is awaited.
   */
  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const current = await this.get();
    const updated: AppSettings = { ...current, [key]: value };
    await this.storage.set(STORAGE_KEY, updated);
    this.logger.debug(`Setting "${String(key)}" updated`);
    this.changeHandlers.forEach((h) => h(updated));
    await this.hooks.onSettingsChanged.call(updated);
  }

  /**
   * Registers a listener that receives the full settings object after each
   * successful `set()`. Multiple listeners are supported and invoked in
   * registration order.
   */
  onChange(handler: (settings: AppSettings) => void): void {
    this.changeHandlers.push(handler);
  }
}
