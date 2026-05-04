// tests/unit/plugins/ClipperPlugin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { IPluginContext } from '@domain/types';
import { ClipperPlugin } from '@plugins/clipper/ClipperPlugin';

import { createMockContext } from '../../helpers/createMockContext';

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface ClipperTestHarness {
  plugin: ClipperPlugin;
  ctx: IPluginContext;
}

/** Builds a fresh ClipperPlugin + mock context with stubbed adapter resolution. */
function setupHarness(): ClipperTestHarness {
  const plugin = new ClipperPlugin();
  const ctx = createMockContext();

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    switch (token) {
      case TYPES.ITabAdapter:
        return { getActiveTab: vi.fn() };
      case TYPES.INotificationAdapter:
        return { notify: vi.fn() };
      case TYPES.IClipService:
        return { clip: vi.fn().mockResolvedValue({ ok: true }) };
      default:
        return undefined;
    }
  });

  return { plugin, ctx };
}

describe('ClipperPlugin — manifest', () => {
  let plugin: ClipperPlugin;

  beforeEach(() => {
    plugin = new ClipperPlugin();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id "clipper"', () => {
    expect(plugin.manifest.id).toBe('clipper');
  });

  it('declares requiredAdapters for ITabAdapter and INotificationAdapter', () => {
    expect(plugin.manifest.requiredAdapters).toContain(TYPES.ITabAdapter);
    expect(plugin.manifest.requiredAdapters).toContain(TYPES.INotificationAdapter);
  });

  it('has no plugin dependencies', () => {
    expect(plugin.manifest.dependencies).toBeUndefined();
  });
});

describe('ClipperPlugin — activate() container resolution', () => {
  let harness: ClipperTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves ITabAdapter from container to verify adapter availability', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.ITabAdapter);
  });

  it('resolves INotificationAdapter from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.INotificationAdapter);
  });

  it('resolves IClipService from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.IClipService);
  });
});

describe('ClipperPlugin — activate() UI registration and logging', () => {
  let harness: ClipperTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers SaveButton component in the popup-footer slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      'popup-footer',
      expect.objectContaining({ component: 'SaveButton' }),
    );
  });

  it('logs activation info', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.logger.info).toHaveBeenCalledWith('ClipperPlugin activated');
  });
});

describe('ClipperPlugin — deactivate()', () => {
  let harness: ClipperTestHarness;

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
});
