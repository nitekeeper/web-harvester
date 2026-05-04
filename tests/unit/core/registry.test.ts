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
