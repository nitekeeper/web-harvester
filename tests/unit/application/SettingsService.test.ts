// tests/unit/application/SettingsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SettingsService, type ISettingsService } from '@application/SettingsService';
import { createLogger } from '@shared/logger';

// Minimal ISettingsStorage mock — mirrors the interface from @infrastructure/storage
/* eslint-disable security/detect-object-injection -- test mock with controlled keys */
function createMockSettingsStorage() {
  let stored: Record<string, unknown> = {};
  const changeHandlers: Array<
    (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void
  > = [];
  return {
    get: vi.fn(async (key: string) => stored[key]),
    set: vi.fn(async (key: string, value: unknown) => {
      const old = stored[key];
      stored[key] = value;
      changeHandlers.forEach((h) => h({ [key]: { oldValue: old, newValue: value } }));
    }),
    remove: vi.fn(async (key: string) => {
      stored = Object.fromEntries(Object.entries(stored).filter(([k]) => k !== key));
    }),
    onChanged: vi.fn(
      (handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void) => {
        changeHandlers.push(handler);
      },
    ),
    // test-only helper
    _reset: () => {
      stored = {};
    },
  };
}
/* eslint-enable security/detect-object-injection */

function createMockHooks() {
  return {
    onSettingsChanged: { tap: vi.fn(), call: vi.fn().mockResolvedValue(undefined) },
  };
}

let storage: ReturnType<typeof createMockSettingsStorage>;
let hooks: ReturnType<typeof createMockHooks>;
let service: ISettingsService;

beforeEach(() => {
  storage = createMockSettingsStorage();
  hooks = createMockHooks();
  service = new SettingsService(storage, hooks, createLogger('test'));
});

describe('SettingsService — get()', () => {
  it('returns schema defaults when no stored settings exist', async () => {
    storage.get.mockResolvedValue(undefined);
    const settings = await service.get();
    expect(settings.version).toBe(2);
    expect(settings.theme).toBe('dark');
    expect(settings.locale).toBe('en');
    expect(settings.conflictStrategy).toBe('suffix');
    expect(settings.customThemeTokens).toEqual({});
    expect(settings.customThemes).toEqual([]);
    expect(settings.defaultDestinationId).toBeUndefined();
  });

  it('merges partial stored data with defaults', async () => {
    storage.get.mockResolvedValue({ theme: 'dark' });
    const settings = await service.get();
    expect(settings.theme).toBe('dark');
    expect(settings.locale).toBe('en'); // default preserved
  });

  it('strips unknown keys from stored data (Zod strict passthrough)', async () => {
    storage.get.mockResolvedValue({ theme: 'light', unknownKey: 'oops' });
    const settings = await service.get();
    expect('unknownKey' in settings).toBe(false);
  });
});

describe('SettingsService — set()', () => {
  it('persists a single key and get() reflects the update', async () => {
    storage.get.mockResolvedValue({ theme: 'system' });
    await service.set('theme', 'dark');
    expect(storage.set).toHaveBeenCalled();
    storage.get.mockResolvedValue({ theme: 'dark' });
    const updated = await service.get();
    expect(updated.theme).toBe('dark');
  });

  it('fires hooks.onSettingsChanged after persisting', async () => {
    storage.get.mockResolvedValue({});
    await service.set('locale', 'fr');
    expect(hooks.onSettingsChanged.call).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'fr' }),
    );
  });
});

const FULL_SETTINGS = {
  version: 1,
  theme: 'dark' as const,
  locale: 'fr',
  conflictStrategy: 'overwrite' as const,
  customThemeTokens: {},
  customThemes: [],
};

describe('SettingsService — setAll()', () => {
  it('persists the full settings object to storage', async () => {
    await service.setAll(FULL_SETTINGS);
    expect(storage.set).toHaveBeenCalledWith(expect.any(String), FULL_SETTINGS);
  });

  it('fires hooks.onSettingsChanged after persisting', async () => {
    await service.setAll(FULL_SETTINGS);
    expect(hooks.onSettingsChanged.call).toHaveBeenCalledWith(FULL_SETTINGS);
  });

  it('notifies onChange handlers after persisting', async () => {
    const handler = vi.fn();
    service.onChange(handler);
    await service.setAll(FULL_SETTINGS);
    expect(handler).toHaveBeenCalledWith(FULL_SETTINGS);
  });
});

describe('SettingsService — onChange()', () => {
  it('calls the handler when settings change via set()', async () => {
    storage.get.mockResolvedValue({});
    const handler = vi.fn();
    service.onChange(handler);
    await service.set('theme', 'dark');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('supports multiple onChange handlers', async () => {
    storage.get.mockResolvedValue({});
    const h1 = vi.fn();
    const h2 = vi.fn();
    service.onChange(h1);
    service.onChange(h2);
    await service.set('locale', 'de');
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });
});
