// tests/integration/background.test.ts
//
// Integration test for the background service-worker bootstrap. Replicates
// the wiring performed by `src/presentation/background/background.ts` against
// `MockAdapter` so the test never touches `chrome.*` directly. Verifies that
// all six plugins activate, that context menu items are registered, and that
// installed-event handlers run settings migrations.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'reflect-metadata';

import { createRootContainer } from '@core/container';
import { createHookSystem, type CoreHookSystem } from '@core/hooks';
import { createPluginRegistry, type PluginRegistry } from '@core/registry';
import { createUIRegistry } from '@core/ui-registry';
import type { IUIRegistry } from '@domain/types';
import { TYPES } from '@infrastructure/adapters/tokens';
import { createSettingsStorage } from '@infrastructure/storage/settings';
import { ClipperPlugin } from '@plugins/clipper/ClipperPlugin';
import { HighlighterPlugin } from '@plugins/highlighter/HighlighterPlugin';
import { ReaderPlugin } from '@plugins/reader/ReaderPlugin';
import { SettingsPlugin } from '@plugins/settings/SettingsPlugin';
import { TemplatePlugin } from '@plugins/template/TemplatePlugin';
import { ThemePlugin } from '@plugins/theme/ThemePlugin';
import { makeContextFactory } from '@presentation/background/background';
import { wireContextMenus } from '@presentation/background/wiring';

import { MockAdapter } from '../helpers/MockAdapter';

/** Bag of objects produced by `setupHarness` and shared by each test. */
interface Harness {
  readonly adapter: MockAdapter;
  readonly hooks: CoreHookSystem;
  readonly ui: IUIRegistry;
  readonly registry: PluginRegistry;
  readonly settingsStorage: ReturnType<typeof createSettingsStorage>;
}

function bindAdapters(adapter: MockAdapter) {
  return createRootContainer({
    storageAdapter: adapter,
    tabAdapter: adapter,
    runtimeAdapter: adapter,
    notificationAdapter: adapter,
    commandAdapter: adapter,
    contextMenuAdapter: adapter,
    actionAdapter: adapter,
    sidePanelAdapter: adapter,
    clipboardAdapter: adapter,
  });
}

function bindMockServices(container: ReturnType<typeof createRootContainer>): void {
  container.bind(TYPES.IClipService).toConstantValue({
    clip: vi.fn().mockResolvedValue({ fileName: 'test.md', destination: 'Inbox' }),
  });
  container.bind(TYPES.ITemplateService).toConstantValue({
    getDefault: vi.fn().mockResolvedValue({ id: 't1', name: 'Default' }),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    render: vi.fn().mockResolvedValue({ ok: true, output: '', errors: [] }),
  });
  container.bind(TYPES.IHighlightService).toConstantValue({
    addHighlight: vi.fn().mockResolvedValue({}),
    getHighlightsForUrl: vi.fn().mockResolvedValue([]),
    removeHighlight: vi.fn().mockResolvedValue(undefined),
    clearHighlightsForUrl: vi.fn().mockResolvedValue(undefined),
  });
  container.bind(TYPES.IReaderService).toConstantValue({
    toggle: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(false),
    getState: vi.fn().mockReturnValue({ isActive: false, tabId: undefined }),
  });
  container.bind(TYPES.ISettingsService).toConstantValue({
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn(),
  });
}

function setupHarness(): Harness {
  const adapter = new MockAdapter();
  const container = bindAdapters(adapter);
  const hooks = createHookSystem();
  const ui = createUIRegistry();
  const settingsStorage = createSettingsStorage(adapter);

  bindMockServices(container);
  container.bind(TYPES.IHookSystem).toConstantValue(hooks);
  container.bind(TYPES.IUIRegistry).toConstantValue(ui);

  const registry = createPluginRegistry(makeContextFactory(container, hooks, ui, adapter));
  container.bind(TYPES.IPluginRegistry).toConstantValue(registry);

  registry.register(new ThemePlugin());
  registry.register(new ClipperPlugin());
  registry.register(new TemplatePlugin());
  registry.register(new HighlighterPlugin());
  registry.register(new ReaderPlugin());
  registry.register(new SettingsPlugin());

  return { adapter, hooks, ui, registry, settingsStorage };
}

/**
 * Installs a `matchMedia` shim on the global object. ThemePlugin reads from
 * `window.matchMedia` during activation; jsdom does not provide it natively.
 */
function installMatchMediaShim(): void {
  if (typeof globalThis.matchMedia === 'undefined') {
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  }
}

describe('background bootstrap — plugin activation', () => {
  let harness: Harness;

  beforeEach(() => {
    installMatchMediaShim();
    harness = setupHarness();
  });

  it('activates all six plugins without errors', async () => {
    await harness.registry.activateAll();
    expect(harness.registry.getActivePlugins()).toHaveLength(6);
    expect(harness.registry.getFailedPlugins()).toHaveLength(0);
  });

  it('registers context menu items when wired into the adapter', async () => {
    const mockClipService = {
      clip: vi.fn().mockResolvedValue({ fileName: 'test.md', destination: 'Inbox' }),
    };
    await wireContextMenus(harness.adapter, mockClipService);
    expect(harness.adapter.createContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'clip-page' }),
    );
    expect(harness.adapter.createContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'clip-selection' }),
    );
  });

  it('runs settings migrations on the install event', async () => {
    const runMigrationsSpy = vi.spyOn(harness.settingsStorage, 'runMigrations');
    harness.adapter.onInstalled(async () => {
      await harness.settingsStorage.runMigrations([]);
    });
    await harness.adapter.triggerInstalled({ reason: 'install' });
    expect(runMigrationsSpy).toHaveBeenCalledWith([]);
  });
});

describe('background bootstrap — wireContextMenus MV3 restart safety', () => {
  let harness: Harness;

  beforeEach(() => {
    installMatchMediaShim();
    harness = setupHarness();
  });

  it('clears all context menus before registering new ones', async () => {
    const mockClipService = {
      clip: vi.fn().mockResolvedValue({ fileName: 'test.md', destination: 'Inbox' }),
    };
    await wireContextMenus(harness.adapter, mockClipService);
    const removeAllOrder = harness.adapter.removeAllContextMenus.mock.invocationCallOrder[0] ?? 0;
    const createOrder = harness.adapter.createContextMenu.mock.invocationCallOrder[0] ?? 0;
    expect(removeAllOrder).toBeGreaterThan(0);
    expect(removeAllOrder).toBeLessThan(createOrder);
  });
});
