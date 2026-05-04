import 'reflect-metadata';
import { Container } from 'inversify';

import type { IActionAdapter } from '@infrastructure/adapters/interfaces/IActionAdapter.js';
import type { IClipboardAdapter } from '@infrastructure/adapters/interfaces/IClipboardAdapter.js';
import type { ICommandAdapter } from '@infrastructure/adapters/interfaces/ICommandAdapter.js';
import type { IContextMenuAdapter } from '@infrastructure/adapters/interfaces/IContextMenuAdapter.js';
import type { INotificationAdapter } from '@infrastructure/adapters/interfaces/INotificationAdapter.js';
import type { IRuntimeAdapter } from '@infrastructure/adapters/interfaces/IRuntimeAdapter.js';
import type { ISidePanelAdapter } from '@infrastructure/adapters/interfaces/ISidePanelAdapter.js';
import type { IStorageAdapter } from '@infrastructure/adapters/interfaces/IStorageAdapter.js';
import type { ITabAdapter } from '@infrastructure/adapters/interfaces/ITabAdapter.js';
import { TYPES } from '@infrastructure/adapters/tokens.js';

/**
 * Concrete adapter instances bound into the root container. Each property
 * matches one of the nine browser adapter interfaces and is registered under
 * the corresponding `TYPES.*` token.
 */
export interface AdapterBindings {
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

/**
 * Creates the root inversify container with all nine browser adapter
 * interfaces bound to the provided concrete instances. Bindings use the
 * default Singleton scope.
 */
export function createRootContainer(adapters: AdapterBindings): Container {
  const container = new Container({ defaultScope: 'Singleton' });

  container.bind(TYPES.IStorageAdapter).toConstantValue(adapters.storageAdapter);
  container.bind(TYPES.ITabAdapter).toConstantValue(adapters.tabAdapter);
  container.bind(TYPES.IRuntimeAdapter).toConstantValue(adapters.runtimeAdapter);
  container.bind(TYPES.INotificationAdapter).toConstantValue(adapters.notificationAdapter);
  container.bind(TYPES.ICommandAdapter).toConstantValue(adapters.commandAdapter);
  container.bind(TYPES.IContextMenuAdapter).toConstantValue(adapters.contextMenuAdapter);
  container.bind(TYPES.IActionAdapter).toConstantValue(adapters.actionAdapter);
  container.bind(TYPES.ISidePanelAdapter).toConstantValue(adapters.sidePanelAdapter);
  container.bind(TYPES.IClipboardAdapter).toConstantValue(adapters.clipboardAdapter);

  return container;
}

/**
 * Creates a child container scoped to a single plugin. Bindings declared on
 * the child do not leak back to the parent, but the child can resolve any
 * binding registered on the parent.
 */
export function createPluginContainer(parent: Container): Container {
  const child = new Container({ defaultScope: 'Transient' });
  child.parent = parent;
  return child;
}
