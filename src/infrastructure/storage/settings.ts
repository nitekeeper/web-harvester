// src/infrastructure/storage/settings.ts

import { z } from 'zod';

import type { IStorageAdapter } from '@infrastructure/adapters/interfaces/IStorageAdapter.js';
import { createLogger } from '@shared/logger.js';

const logger = createLogger('settings-storage');

const SETTINGS_KEY = 'settings';
const VERSION_FIELD = 'version';
/**
 * Returns the storage key for the backup of the settings object that
 * existed immediately before migration `v + 1` ran.
 */
function backupKey(version: number): string {
  return `backup_v${version}`;
}
const MAX_BACKUPS = 3;

/**
 * A single migration step. `up` must be a pure function that takes the
 * stored settings shape at version `version - 1` and returns the shape at
 * version `version`. The migration runner stamps `version` onto the result.
 */
export interface IMigration {
  readonly version: number;
  readonly description: string;
  readonly up: (data: unknown) => unknown;
}

/**
 * Reads the current settings record from local storage as a plain object,
 * returning an empty record when no value is stored.
 */
async function readRaw(adapter: IStorageAdapter): Promise<Record<string, unknown>> {
  const raw = (await adapter.getLocal(SETTINGS_KEY)) as Record<string, unknown> | undefined;
  return raw ?? {};
}

/**
 * Writes a snapshot of the current settings under `backup_v{version}` and
 * prunes the oldest backup once `MAX_BACKUPS` is exceeded.
 */
async function backup(adapter: IStorageAdapter, version: number): Promise<void> {
  const current = await adapter.getLocal(SETTINGS_KEY);
  await adapter.setLocal(backupKey(version), current);
  // Prune old backups — keep only the last MAX_BACKUPS versions
  const oldVersion = version - MAX_BACKUPS;
  if (oldVersion >= 0) await adapter.removeLocal(backupKey(oldVersion));
}

/**
 * Filters and sorts the supplied migrations down to those that still need
 * to run given the current persisted version.
 */
function pendingMigrations(migrations: IMigration[], currentVersion: number): IMigration[] {
  return migrations.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);
}

/**
 * Applies a single migration step, taking a backup of the prior state and
 * restoring it on failure before re-throwing the original error.
 */
async function applyMigration(
  adapter: IStorageAdapter,
  migration: IMigration,
  data: unknown,
): Promise<unknown> {
  await backup(adapter, migration.version - 1);
  logger.info(`Running migration v${migration.version}: ${migration.description}`);
  try {
    return migration.up(data);
  } catch (err) {
    logger.error(`Migration v${migration.version} failed — restoring backup`, err);
    const saved = await adapter.getLocal(backupKey(migration.version - 1));
    await adapter.setLocal(SETTINGS_KEY, saved);
    throw err;
  }
}

/**
 * Builds a settings storage facade backed by `IStorageAdapter`. The facade
 * exposes schema-validated reads, single-key merging writes, and a
 * versioned migration runner with automatic per-step backups.
 */
export function createSettingsStorage(adapter: IStorageAdapter): {
  get<T>(schema: z.ZodType<T>): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  backup(version: number): Promise<void>;
  getBackup(version: number): Promise<unknown>;
  runMigrations(migrations: IMigration[]): Promise<void>;
} {
  return {
    async get<T>(schema: z.ZodType<T>): Promise<T> {
      const raw = await adapter.getLocal(SETTINGS_KEY);
      const parsed = schema.safeParse(raw ?? {});
      if (parsed.success) return parsed.data;
      logger.warn('Settings validation failed, returning defaults', parsed.error);
      return schema.parse({});
    },

    async set<T>(key: string, value: T): Promise<void> {
      const current = await readRaw(adapter);
      await adapter.setLocal(SETTINGS_KEY, { ...current, [key]: value });
    },

    backup: (version: number): Promise<void> => backup(adapter, version),

    async getBackup(version: number): Promise<unknown> {
      return adapter.getLocal(backupKey(version));
    },

    async runMigrations(migrations: IMigration[]): Promise<void> {
      const raw = await readRaw(adapter);
      const versionValue = Reflect.get(raw, VERSION_FIELD);
      const currentVersion = typeof versionValue === 'number' ? versionValue : 0;

      const pending = pendingMigrations(migrations, currentVersion);
      if (pending.length === 0) return;

      let data: unknown = raw;
      for (const migration of pending) {
        data = await applyMigration(adapter, migration, data);
      }

      await adapter.setLocal(SETTINGS_KEY, data);
      const last = pending[pending.length - 1];
      if (last) logger.info(`Settings migrated to v${last.version}`);
    },
  };
}
