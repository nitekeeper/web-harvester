import { topologicalSort } from '@core/topology';
import type { IPlugin, IPluginContext } from '@domain/types';
import { createLogger } from '@shared/logger';

const logger = createLogger('plugin-registry');

/** A failed plugin record carrying the offending id and the thrown error. */
export interface FailedPlugin {
  readonly id: string;
  readonly error: unknown;
}

/** Plugin registry — tracks registered plugins and orchestrates their lifecycle. */
export interface PluginRegistry {
  register(plugin: IPlugin): void;
  activateAll(): Promise<void>;
  deactivateAll(): Promise<void>;
  isActive(id: string): boolean;
  isFailed(id: string): boolean;
  getActivePlugins(): string[];
  getFailedPlugins(): FailedPlugin[];
}

/** Internal state shared by registry operations. */
interface RegistryState {
  readonly plugins: Map<string, IPlugin>;
  readonly active: Set<string>;
  readonly failed: Map<string, unknown>;
  activationOrder: string[];
}

/** Compute the activation order from registered plugins via topological sort. */
function computeActivationOrder(plugins: ReadonlyMap<string, IPlugin>): string[] {
  const nodes = [...plugins.values()].map((p) => ({
    id: p.manifest.id,
    dependencies: [...(p.manifest.dependencies ?? [])],
  }));
  return topologicalSort(nodes);
}

/** Activate a single plugin, isolating any thrown error into the failed map. */
async function activateOne(
  state: RegistryState,
  id: string,
  contextFactory: (plugin: IPlugin) => IPluginContext,
): Promise<void> {
  const plugin = state.plugins.get(id);
  if (!plugin) return;
  try {
    const context = contextFactory(plugin);
    await plugin.activate(context);
    state.active.add(id);
  } catch (err) {
    state.failed.set(id, err);
    logger.error(`Plugin "${id}" failed to activate`, err);
  }
}

/** Deactivate a single plugin, isolating any thrown error to the logger. */
async function deactivateOne(state: RegistryState, id: string): Promise<void> {
  if (!state.active.has(id)) return;
  const plugin = state.plugins.get(id);
  if (!plugin) return;
  try {
    await plugin.deactivate();
    state.active.delete(id);
  } catch (err) {
    logger.error(`Plugin "${id}" failed to deactivate`, err);
  }
}

/** Creates a plugin registry that orders activation by dependency graph. */
export function createPluginRegistry(
  contextFactory: (plugin: IPlugin) => IPluginContext,
): PluginRegistry {
  const state: RegistryState = {
    plugins: new Map(),
    active: new Set(),
    failed: new Map(),
    activationOrder: [],
  };

  return {
    register(plugin: IPlugin): void {
      state.plugins.set(plugin.manifest.id, plugin);
    },
    async activateAll(): Promise<void> {
      state.activationOrder = computeActivationOrder(state.plugins);
      for (const id of state.activationOrder) {
        await activateOne(state, id, contextFactory);
      }
    },
    async deactivateAll(): Promise<void> {
      for (const id of [...state.activationOrder].reverse()) {
        await deactivateOne(state, id);
      }
    },
    isActive: (id) => state.active.has(id),
    isFailed: (id) => state.failed.has(id),
    getActivePlugins: () => [...state.active],
    getFailedPlugins: () => [...state.failed.entries()].map(([id, error]) => ({ id, error })),
  };
}
