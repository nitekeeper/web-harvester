// tests/unit/plugins/ReaderPlugin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TYPES } from '@core/types';
import type { IPluginContext } from '@domain/types';
import { ReaderPlugin } from '@plugins/reader/ReaderPlugin';

import { createMockContext } from '../../helpers/createMockContext';

const POPUP_TOOLBAR = 'popup-toolbar';

/** Bundle of objects produced by `setupHarness` and shared by each test. */
interface ReaderTestHarness {
  plugin: ReaderPlugin;
  ctx: IPluginContext;
  mockReaderService: { toggle: ReturnType<typeof vi.fn> };
  mockTabAdapter: { getActiveTab: ReturnType<typeof vi.fn> };
}

/** Builds a fresh ReaderPlugin + mock context with stubbed adapter resolution. */
function setupHarness(): ReaderTestHarness {
  const plugin = new ReaderPlugin();
  const ctx = createMockContext();

  const mockReaderService = {
    toggle: vi.fn().mockResolvedValue(undefined),
  };
  const mockTabAdapter = {
    getActiveTab: vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com' }),
  };

  vi.mocked(ctx.container.get).mockImplementation((token) => {
    if (Object.is(token, TYPES.IReaderService)) return mockReaderService;
    if (Object.is(token, TYPES.ITabAdapter)) return mockTabAdapter;
    return undefined;
  });

  return { plugin, ctx, mockReaderService, mockTabAdapter };
}

/** Pulls the `popup-toolbar` registration recorded on the mocked `ui.addToSlot`. */
function getToolbarRegistration(ctx: IPluginContext): { onClick: () => Promise<void> } {
  const call = vi.mocked(ctx.ui.addToSlot).mock.calls.find(([slot]) => slot === POPUP_TOOLBAR);
  expect(call).toBeDefined();
  return call?.[1] as { onClick: () => Promise<void> };
}

describe('ReaderPlugin — manifest', () => {
  let plugin: ReaderPlugin;

  beforeEach(() => {
    plugin = new ReaderPlugin();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has id "reader"', () => {
    expect(plugin.manifest.id).toBe('reader');
  });

  it('has no plugin dependencies', () => {
    expect(plugin.manifest.dependencies).toBeUndefined();
  });

  it('has version 1.0.0', () => {
    expect(plugin.manifest.version).toBe('1.0.0');
  });
});

describe('ReaderPlugin — activate() container resolution', () => {
  let harness: ReaderTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves IReaderService from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.IReaderService);
  });

  it('resolves ITabAdapter from container', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.container.get).toHaveBeenCalledWith(TYPES.ITabAdapter);
  });
});

describe('ReaderPlugin — activate() UI registration', () => {
  let harness: ReaderTestHarness;

  beforeEach(() => {
    harness = setupHarness();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers reader toggle button in popup-toolbar slot', async () => {
    await harness.plugin.activate(harness.ctx);

    expect(harness.ctx.ui.addToSlot).toHaveBeenCalledWith(
      POPUP_TOOLBAR,
      expect.objectContaining({ component: 'ReaderButton' }),
    );
  });

  it('registers component with an onClick handler that toggles for the active tab id', async () => {
    await harness.plugin.activate(harness.ctx);
    const registration = getToolbarRegistration(harness.ctx);
    expect(typeof registration.onClick).toBe('function');

    await registration.onClick();

    expect(harness.mockTabAdapter.getActiveTab).toHaveBeenCalledTimes(1);
    expect(harness.mockReaderService.toggle).toHaveBeenCalledTimes(1);
    expect(harness.mockReaderService.toggle).toHaveBeenCalledWith(42);
  });

  it('skips toggle when the active tab has no id', async () => {
    harness.mockTabAdapter.getActiveTab.mockResolvedValueOnce({ url: 'https://example.com' });
    await harness.plugin.activate(harness.ctx);
    const registration = getToolbarRegistration(harness.ctx);

    await registration.onClick();

    expect(harness.mockReaderService.toggle).not.toHaveBeenCalled();
  });
});

describe('ReaderPlugin — deactivate()', () => {
  let harness: ReaderTestHarness;

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
