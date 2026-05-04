# DI Container API

## Overview

The container module provides two Inversify container factories used at extension startup and
during plugin activation. `createRootContainer` wires the nine browser adapter interfaces to
their concrete implementations and serves as the application-wide singleton scope.
`createPluginContainer` creates a child container scoped to a single plugin's transient bindings;
it inherits all parent bindings but its own bindings are isolated and do not leak upward.

## Interface

### `createRootContainer(adapters: AdapterBindings): Container`

Creates a new Inversify `Container` with `defaultScope: 'Singleton'` and binds each of the nine
adapter interfaces to the supplied concrete instances under the corresponding `TYPES.*` symbol.
Returns the ready container.

All nine adapters must be provided — there is no partial binding; missing adapters will cause
runtime resolution errors when the container is first used.

---

### `AdapterBindings`

```typescript
interface AdapterBindings {
  readonly storageAdapter: IStorageAdapter;
  readonly tabAdapter: ITabAdapter;
  readonly runtimeAdapter: IRuntimeAdapter;
  readonly notificationAdapter: INotificationAdapter;
  readonly commandAdapter: ICommandAdapter;
  readonly contextMenuAdapter: IContextMenuAdapter;
  readonly actionAdapter: IActionAdapter;
  readonly sidePanelAdapter: ISidePanelAdapter;
  readonly clipboardAdapter: IClipboardAdapter;
}
```

---

### `createPluginContainer(parent: Container): Container`

Creates a child `Container` with `defaultScope: 'Transient'` and sets `child.parent = parent`.
The child can resolve any binding registered on the parent. Returns the child container.

The caller is responsible for disposing the child container when the plugin deactivates.

## Usage Example

```typescript
import { createRootContainer, createPluginContainer } from '@core/container';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';

// At extension startup — one ChromeAdapter implements all 9 interfaces
const adapter = new ChromeAdapter();

const root = createRootContainer({
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

// During plugin activation
const pluginContainer = createPluginContainer(root);

// Resolve an adapter from the child (falls through to parent)
const storage = pluginContainer.get<IStorageAdapter>(TYPES.IStorageAdapter);

// On plugin deactivation — dispose the child container
pluginContainer.unbindAll();
```

## Notes

- The root container uses `toConstantValue` bindings, which are effectively singleton scope
  regardless of the container's `defaultScope`.
- `TYPES.*` symbols are defined in `src/infrastructure/adapters/tokens.ts`. Always use these
  tokens when binding or resolving — never use strings or plain constructors.
- The child container's `Transient` scope means any additional bindings added to the child create
  a new instance on every `get()` call.
- Child containers are not automatically cleaned up. Callers must call `child.unbindAll()` (or
  similar) on plugin deactivation to release references.
