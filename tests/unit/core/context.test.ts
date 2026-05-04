import { describe, it, expect, beforeEach } from 'vitest';

import { createPluginStorage } from '@core/context';

import { MockAdapter } from '../../helpers/MockAdapter';

describe('createPluginStorage', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('namespaces keys under plugin:<id>:', async () => {
    const storage = createPluginStorage('my-plugin', adapter);
    await storage.set('token', 'abc');
    const raw = await adapter.getLocal('plugin:my-plugin:token');
    expect(raw).toBe('abc');
  });

  it('gets a value via the namespaced key', async () => {
    await adapter.setLocal('plugin:my-plugin:token', 'xyz');
    const storage = createPluginStorage('my-plugin', adapter);
    const value = await storage.get<string>('token');
    expect(value).toBe('xyz');
  });

  it('removes a value via the namespaced key', async () => {
    await adapter.setLocal('plugin:my-plugin:flag', true);
    const storage = createPluginStorage('my-plugin', adapter);
    await storage.remove('flag');
    const value = await storage.get<boolean>('flag');
    expect(value).toBeUndefined();
  });

  it('clear removes all tracked keys for the plugin', async () => {
    const storage = createPluginStorage('my-plugin', adapter);
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    expect(await storage.get('a')).toBeUndefined();
    expect(await storage.get('b')).toBeUndefined();
  });

  it('two plugins do not share keys', async () => {
    const s1 = createPluginStorage('plugin-a', adapter);
    const s2 = createPluginStorage('plugin-b', adapter);
    await s1.set('key', 'from-a');
    const val = await s2.get<string>('key');
    expect(val).toBeUndefined();
  });
});
