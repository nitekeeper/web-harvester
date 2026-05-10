# Plugin Registry API

## Overview

The plugin registry manages the full lifecycle of all registered plugins: registration, ordered
activation, and ordered deactivation. Activation order is determined by a topological sort of the
plugin dependency graph — a plugin's dependencies are guaranteed to be active before it starts.
Each activation is individually error-bounded so that a failing plugin does not halt others.
Deactivation runs in the reverse of the activation order.

## Interface

### `createPluginRegistry(contextFactory): PluginRegistry`

```typescript
function createPluginRegistry(contextFactory: (plugin: IPlugin) => IPluginContext): PluginRegistry;
```

Creates a new registry. The `contextFactory` callback is called once per plugin during
`activateAll`; it should construct and return the `IPluginContext` to pass to `plugin.activate()`.

---

### `PluginRegistry`

#### `register(plugin: IPlugin): void`

Adds a plugin to the registry. Must be called before `activateAll`. Calling `register` after
`activateAll` has run results in the plugin not being activated in the current session.

#### `activateAll(): Promise<void>`

Computes the activation order from the registered plugin dependency graph and activates each
plugin in that order. Plugins that throw during `activate()` are recorded as failed and logged;
the remaining plugins continue to activate.

Throws `CircularDependencyError` (from `topologicalSort`) if a dependency cycle is detected, or
`Error` if a plugin declares a dependency that is not registered.

#### `deactivateAll(): Promise<void>`

Deactivates all active plugins in the reverse of the activation order. Errors during
`plugin.deactivate()` are caught and logged; deactivation of the remaining plugins continues.

#### `isActive(id: string): boolean`

Returns `true` if the plugin with the given id is currently active.

#### `isFailed(id: string): boolean`

Returns `true` if the plugin with the given id failed to activate.

#### `getActivePlugins(): string[]`

Returns an array of ids for all currently active plugins.

#### `getFailedPlugins(): FailedPlugin[]`

Returns an array of `{ id, error }` records for all plugins that failed to activate.

#### `getPluginRows(): PluginRow[]`

Returns every registered plugin as a serialisable `PluginRow` record, suitable for writing to
`chrome.storage.local` or displaying in the Plugins settings page. The state field reflects the
plugin's current lifecycle:

- `active` — `activate()` completed without error
- `failed` — `activate()` threw; the normalised error message is included in `error`
- `inactive` — registered but `activateAll()` has not run yet, or activation was skipped

Imported type `PluginRow` lives in `@shared/pluginStatus`.

---

### `FailedPlugin`

```typescript
interface FailedPlugin {
  readonly id: string;
  readonly error: unknown;
}
```

## Usage Example

```typescript
import { createPluginRegistry } from '@core/registry';
import { createHookSystem } from '@core/hooks';
import { createLogger } from '@shared/logger';

const hooks = createHookSystem();

const registry = createPluginRegistry((plugin) => ({
  hooks,
  container: createPluginContainer(rootContainer),
  logger: createLogger(plugin.manifest.id),
  storage: createPluginStorage(plugin.manifest.id, storageAdapter),
  ui: uiRegistry,
}));

registry.register(myPlugin);
registry.register(anotherPlugin);

await registry.activateAll();

console.log('active:', registry.getActivePlugins());
console.log('failed:', registry.getFailedPlugins());

// On extension shutdown
await registry.deactivateAll();
```

## Notes

- `register` after `activateAll` is silently accepted but the late-registered plugin will not be
  activated until the next call to `activateAll`.
- A plugin that throws during `activate()` is moved to the failed list, not the active list. Its
  dependencies that already activated are unaffected.
- `deactivateAll` only deactivates plugins that are in the active set — failed plugins and
  unregistered plugins are ignored.
