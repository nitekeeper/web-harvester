// tests/unit/infrastructure/storage/settings.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { createSettingsStorage, type IMigration } from '@infrastructure/storage/settings';

import { MockAdapter } from '../../../helpers/MockAdapter';

const SettingsSchema = z.object({
  version: z.number().default(0),
  theme: z.string().default('system'),
  locale: z.string().default('en'),
});

let adapter: MockAdapter;
let storage: ReturnType<typeof createSettingsStorage>;

beforeEach(() => {
  adapter = new MockAdapter();
  storage = createSettingsStorage(adapter);
});

describe('SettingsStorage get + set', () => {
  it('returns defaults when no data is stored', async () => {
    const settings = await storage.get(SettingsSchema);
    expect(settings.theme).toBe('system');
    expect(settings.locale).toBe('en');
  });

  it('merges stored data with schema defaults', async () => {
    await adapter.setLocal('settings', { version: 1, theme: 'dark' });
    const settings = await storage.get(SettingsSchema);
    expect(settings.theme).toBe('dark');
    expect(settings.locale).toBe('en'); // default filled in by zod
  });

  it('set merges a single key into the existing settings object', async () => {
    await adapter.setLocal('settings', { version: 1, theme: 'light' });
    await storage.set('locale', 'fr');
    const settings = await storage.get(SettingsSchema);
    expect(settings.locale).toBe('fr');
    expect(settings.theme).toBe('light'); // unchanged
  });
});

describe('SettingsStorage runMigrations order', () => {
  it('runs migrations in version order', async () => {
    await adapter.setLocal('settings', { version: 0, theme: 'dark' });
    const migrations: IMigration[] = [
      {
        version: 1,
        description: 'rename theme to colorScheme',
        up: (data: unknown) => {
          const d = data as Record<string, unknown>;
          return { version: 1, colorScheme: d['theme'] };
        },
      },
    ];
    await storage.runMigrations(migrations);
    const raw = (await adapter.getLocal('settings')) as Record<string, unknown>;
    expect(raw['colorScheme']).toBe('dark');
    expect(raw['version']).toBe(1);
  });
});

describe('SettingsStorage runMigrations skip', () => {
  it('skips migrations already applied', async () => {
    await adapter.setLocal('settings', { version: 2, theme: 'dark' });
    let callCount = 0;
    const migrations: IMigration[] = [
      {
        version: 1,
        description: 'already applied',
        up: (d) => {
          callCount++;
          return d;
        },
      },
      {
        version: 2,
        description: 'also already applied',
        up: (d) => {
          callCount++;
          return d;
        },
      },
    ];
    await storage.runMigrations(migrations);
    expect(callCount).toBe(0);
  });
});

describe('SettingsStorage backup behaviour', () => {
  it('backs up settings before migrating', async () => {
    await adapter.setLocal('settings', { version: 0, data: 'old' });
    const migrations: IMigration[] = [
      {
        version: 1,
        description: 'test migration',
        up: (d) => ({ ...(d as object), version: 1 }),
      },
    ];
    await storage.runMigrations(migrations);
    const backup = await storage.getBackup(0);
    expect(backup).toEqual({ version: 0, data: 'old' });
  });

  it('restores backup and re-throws when migration throws', async () => {
    await adapter.setLocal('settings', { version: 0, data: 'original' });
    const migrations: IMigration[] = [
      {
        version: 1,
        description: 'failing migration',
        up: () => {
          throw new Error('migration failed');
        },
      },
    ];
    await expect(storage.runMigrations(migrations)).rejects.toThrow('migration failed');
    // Settings should have been restored to the pre-migration state
    const raw = await adapter.getLocal('settings');
    expect((raw as Record<string, unknown>)['data']).toBe('original');
  });
});
