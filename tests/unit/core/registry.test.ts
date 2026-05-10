import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPluginRegistry } from '@core/registry';
import type { IPlugin, IPluginContext } from '@domain/types';

function makePlugin(id: string, deps: string[] = []): IPlugin {
  return {
    manifest: { id, name: id, version: '1.0.0', dependencies: deps },
    activate: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockContext(): IPluginContext {
  return {
    hooks: {} as IPluginContext['hooks'],
    container: {} as IPluginContext['container'],
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
    ui: {
      addToSlot: vi.fn(),
      registerComponent: vi.fn(),
      getComponent: vi.fn(),
      registerThemeTokens: vi.fn(),
    },
  };
}

let registry: ReturnType<typeof createPluginRegistry>;

beforeEach(() => {
  const mockContext = makeMockContext();
  registry = createPluginRegistry(() => mockContext);
});

describe('PluginRegistry — activation order', () => {
  it('activates plugins in dependency order', async () => {
    const order: string[] = [];
    const a = makePlugin('a');
    const b = makePlugin('b', ['a']);
    (a.activate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('a');
    });
    (b.activate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('b');
    });

    registry.register(b);
    registry.register(a);
    await registry.activateAll();

    expect(order).toEqual(['a', 'b']);
  });

  it('marks plugin as active after successful activation', async () => {
    const plugin = makePlugin('test');
    registry.register(plugin);
    await registry.activateAll();
    expect(registry.isActive('test')).toBe(true);
  });
});

describe('PluginRegistry — error isolation', () => {
  it('marks plugin as failed when activation throws, does not crash other plugins', async () => {
    const bad = makePlugin('bad');
    const good = makePlugin('good');
    (bad.activate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('activation failed'));

    registry.register(bad);
    registry.register(good);
    await registry.activateAll();

    expect(registry.isFailed('bad')).toBe(true);
    expect(registry.isActive('good')).toBe(true);
  });

  it('returns list of active and failed plugins', async () => {
    const good = makePlugin('good');
    const bad = makePlugin('bad');
    (bad.activate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    registry.register(good);
    registry.register(bad);
    await registry.activateAll();

    expect(registry.getActivePlugins()).toContain('good');
    expect(registry.getFailedPlugins().map((f) => f.id)).toContain('bad');
  });
});

describe('PluginRegistry — deactivation', () => {
  it('deactivates plugins in reverse activation order', async () => {
    const order: string[] = [];
    const a = makePlugin('a');
    const b = makePlugin('b', ['a']);
    (a.deactivate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('a');
    });
    (b.deactivate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('b');
    });

    registry.register(a);
    registry.register(b);
    await registry.activateAll();
    await registry.deactivateAll();

    expect(order).toEqual(['b', 'a']);
  });
});

describe('PluginRegistry — getPluginRows', () => {
  it('returns an empty array when no plugins are registered', async () => {
    expect(registry.getPluginRows()).toEqual([]);
  });

  it('returns active state for a successfully activated plugin', async () => {
    const ALPHA_ID = 'wh.test.alpha';
    const plugin = makePlugin(ALPHA_ID);
    registry.register(plugin);
    await registry.activateAll();

    const rows = registry.getPluginRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: ALPHA_ID, name: ALPHA_ID, state: 'active' });
  });

  it('returns failed state and normalised error string for a plugin that threw', async () => {
    const bad = makePlugin('wh.test.bad');
    (bad.activate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('init crash'));
    registry.register(bad);
    await registry.activateAll();

    const rows = registry.getPluginRows();
    expect(rows[0]).toMatchObject({ id: 'wh.test.bad', state: 'failed', error: 'init crash' });
  });

  it('returns inactive state for a registered-but-not-yet-activated plugin', async () => {
    const plugin = makePlugin('wh.test.inactive');
    registry.register(plugin);
    // activateAll NOT called

    const rows = registry.getPluginRows();
    expect(rows[0]).toMatchObject({ id: 'wh.test.inactive', state: 'inactive' });
  });
});

describe('PluginRegistry — getPluginRows (manifest and lifecycle)', () => {
  it('includes version from the plugin manifest', async () => {
    const plugin: IPlugin = {
      manifest: { id: 'wh.test.v', name: 'Versioned', version: '1.2.3' },
      activate: vi.fn().mockResolvedValue(undefined),
      deactivate: vi.fn().mockResolvedValue(undefined),
    };
    registry.register(plugin);
    await registry.activateAll();

    const rows = registry.getPluginRows();
    expect(rows[0]).toMatchObject({ version: '1.2.3' });
  });

  it('returns inactive state for a previously-active plugin after deactivateAll', async () => {
    const plugin = makePlugin('wh.test.deactivated');
    registry.register(plugin);
    await registry.activateAll();
    expect(registry.getPluginRows()[0]).toMatchObject({ state: 'active' });

    await registry.deactivateAll();
    expect(registry.getPluginRows()[0]).toMatchObject({
      id: 'wh.test.deactivated',
      state: 'inactive',
    });
  });
});
