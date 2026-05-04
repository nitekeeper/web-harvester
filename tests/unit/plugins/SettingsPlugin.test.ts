// tests/unit/plugins/SettingsPlugin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { IPluginContext, Settings } from '@domain/types';
import { SettingsPlugin } from '@plugins/settings/SettingsPlugin';

import { createMockContext } from '../../helpers/createMockContext';

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface SettingsTestHarness {
  plugin: SettingsPlugin;
  ctx: IPluginContext;
  mockSettingsService: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    onChange: ReturnType<typeof vi.fn>;
  };
  mockPluginRegistry: {
    getActivePlugins: ReturnType<typeof vi.fn>;
    getFailedPlugins: ReturnType<typeof vi.fn>;
  };
}

/** Builds a fresh SettingsPlugin + mock context with stubbed container resolution. */
function setupHarness(): SettingsTestHarness {
  const plugin = new SettingsPlugin();
  const ctx = createMockContext();

  const mockSettingsService = {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({}),
    onChange: vi.fn(),
  };

  const mockPluginRegistry = {
    getActivePlugins: vi.fn().mockReturnValue([]),
    getFailedPlugins: vi.fn().mockReturnValue([]),
  };

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    switch (token) {
      case TYPES.ISettingsService:
        return mockSettingsService;
      case TYPES.IPluginRegistry:
        return mockPluginRegistry;
      default:
        return undefined;
    }
  });

  return { plugin, ctx, mockSettingsService, mockPluginRegistry };
}

describe('SettingsPlugin — manifest', () => {
  let plugin: SettingsPlugin;

  beforeEach(() => {
    plugin = new SettingsPlugin();
  });

  it('has id "settings"', () => {
    expect(plugin.manifest.id).toBe('settings');
  });

  it('has version 1.0.0', () => {
    expect(plugin.manifest.version).toBe('1.0.0');
  });

  it('has no plugin dependencies', () => {
    expect(plugin.manifest.dependencies).toBeUndefined();
  });
});

describe('SettingsPlugin — activate() container resolution', () => {
  let harness: SettingsTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves ISettingsService from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.ISettingsService);
  });

  it('resolves IPluginRegistry from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.IPluginRegistry);
  });
});

describe('SettingsPlugin — activate() UI registration', () => {
  let harness: SettingsTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers GeneralSettingsNav in the settings-nav slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'settings-nav',
      expect.objectContaining({ component: 'GeneralSettingsNav' }),
    );
  });

  it('registers GeneralSettingsPanel in the settings-section slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'settings-section',
      expect.objectContaining({ component: 'GeneralSettingsPanel' }),
    );
  });

  it('registers DebugPanel in the settings-section slot', async () => {
    await harness.plugin.activate(harness.ctx);

    const debugCall = vi
      .mocked(harness.ctx.ui.addToSlot)
      .mock.calls.find(
        ([slot, contribution]) =>
          slot === 'settings-section' &&
          (contribution as { component?: string }).component === 'DebugPanel',
      );
    expect(debugCall).toBeDefined();
  });
});

describe('SettingsPlugin — onSettingsChanged hook', () => {
  let harness: SettingsTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists new settings via settingsService.set when onSettingsChanged fires', async () => {
    await harness.plugin.activate(harness.ctx);

    const newSettings: Settings = { theme: 'dark', locale: 'en' };
    await harness.ctx.hooks.onSettingsChanged.call(newSettings);

    expect(harness.mockSettingsService.set).toHaveBeenCalledWith(newSettings);
  });
});

describe('SettingsPlugin — deactivate()', () => {
  let harness: SettingsTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without error after activate()', async () => {
    await harness.plugin.activate(harness.ctx);

    await expect(harness.plugin.deactivate()).resolves.toBeUndefined();
  });

  it('resolves without error before activate()', async () => {
    await expect(harness.plugin.deactivate()).resolves.toBeUndefined();
  });

  it('unsubscribes the onSettingsChanged tap on deactivate', async () => {
    await harness.plugin.activate(harness.ctx);
    await harness.plugin.deactivate();

    harness.mockSettingsService.set.mockClear();

    await harness.ctx.hooks.onSettingsChanged.call({ theme: 'dark' });

    expect(harness.mockSettingsService.set).not.toHaveBeenCalled();
  });
});
