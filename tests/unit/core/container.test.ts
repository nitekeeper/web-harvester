import { describe, it, expect } from 'vitest';

import 'reflect-metadata';
import { createRootContainer, createPluginContainer, type AdapterBindings } from '@core/container';
import { TYPES } from '@infrastructure/adapters/tokens';

import { MockAdapter } from '../../helpers/MockAdapter';

function makeBindings(): AdapterBindings {
  const adapter = new MockAdapter();
  return {
    storageAdapter: adapter,
    tabAdapter: adapter,
    runtimeAdapter: adapter,
    notificationAdapter: adapter,
    commandAdapter: adapter,
    contextMenuAdapter: adapter,
    actionAdapter: adapter,
    sidePanelAdapter: adapter,
    clipboardAdapter: adapter,
  };
}

describe('createRootContainer', () => {
  it('resolves IStorageAdapter to the provided instance', () => {
    const bindings = makeBindings();
    const container = createRootContainer(bindings);
    const resolved = container.get(TYPES.IStorageAdapter);
    expect(resolved).toBe(bindings.storageAdapter);
  });

  it('resolves all nine adapter tokens', () => {
    const bindings = makeBindings();
    const container = createRootContainer(bindings);
    expect(container.get(TYPES.ITabAdapter)).toBe(bindings.tabAdapter);
    expect(container.get(TYPES.IRuntimeAdapter)).toBe(bindings.runtimeAdapter);
    expect(container.get(TYPES.INotificationAdapter)).toBe(bindings.notificationAdapter);
    expect(container.get(TYPES.ICommandAdapter)).toBe(bindings.commandAdapter);
    expect(container.get(TYPES.IContextMenuAdapter)).toBe(bindings.contextMenuAdapter);
    expect(container.get(TYPES.IActionAdapter)).toBe(bindings.actionAdapter);
    expect(container.get(TYPES.ISidePanelAdapter)).toBe(bindings.sidePanelAdapter);
    expect(container.get(TYPES.IClipboardAdapter)).toBe(bindings.clipboardAdapter);
  });

  it('returns the same instance on repeated gets (singleton scope)', () => {
    const container = createRootContainer(makeBindings());
    const a = container.get(TYPES.IStorageAdapter);
    const b = container.get(TYPES.IStorageAdapter);
    expect(a).toBe(b);
  });
});

describe('createPluginContainer', () => {
  it('creates a child container that inherits parent bindings', () => {
    const bindings = makeBindings();
    const root = createRootContainer(bindings);
    const child = createPluginContainer(root);
    const resolved = child.get(TYPES.IStorageAdapter);
    expect(resolved).toBe(bindings.storageAdapter);
  });

  it('does not pollute the parent when a child binding is added', () => {
    const root = createRootContainer(makeBindings());
    const child = createPluginContainer(root);

    const childOnlyToken = Symbol('ChildOnly');
    child.bind(childOnlyToken).toConstantValue('child-value');

    expect(child.get(childOnlyToken)).toBe('child-value');
    expect(() => root.get(childOnlyToken)).toThrow();
  });
});
