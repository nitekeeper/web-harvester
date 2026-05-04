import type { IPluginStorage } from '@domain/types.js';
import type { IStorageAdapter } from '@infrastructure/adapters/interfaces/IStorageAdapter.js';

async function readKeyIndex(adapter: IStorageAdapter, keysIndexKey: string): Promise<string[]> {
  const raw = await adapter.getLocal(keysIndexKey);
  return Array.isArray(raw) ? (raw as string[]) : [];
}

async function trackKey(
  adapter: IStorageAdapter,
  keysIndexKey: string,
  key: string,
): Promise<void> {
  const keys = await readKeyIndex(adapter, keysIndexKey);
  if (!keys.includes(key)) {
    await adapter.setLocal(keysIndexKey, [...keys, key]);
  }
}

async function untrackKey(
  adapter: IStorageAdapter,
  keysIndexKey: string,
  key: string,
): Promise<void> {
  const keys = await readKeyIndex(adapter, keysIndexKey);
  await adapter.setLocal(
    keysIndexKey,
    keys.filter((k) => k !== key),
  );
}

/**
 * Builds an `IPluginStorage` whose keys are namespaced under
 * `plugin:<pluginId>:` in the underlying storage adapter. Keys written via
 * the returned storage are tracked in a per-plugin index so that `clear()`
 * can remove them all without enumerating the entire storage.
 */
export function createPluginStorage(pluginId: string, adapter: IStorageAdapter): IPluginStorage {
  const prefix = `plugin:${pluginId}:`;
  const keysIndexKey = `plugin:${pluginId}:__keys`;

  return {
    async get<T>(key: string): Promise<T | undefined> {
      return adapter.getLocal(prefix + key) as Promise<T | undefined>;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await adapter.setLocal(prefix + key, value);
      await trackKey(adapter, keysIndexKey, key);
    },
    async remove(key: string): Promise<void> {
      await adapter.removeLocal(prefix + key);
      await untrackKey(adapter, keysIndexKey, key);
    },
    async clear(): Promise<void> {
      const keys = await readKeyIndex(adapter, keysIndexKey);
      for (const k of keys) {
        await adapter.removeLocal(prefix + k);
      }
      await adapter.removeLocal(keysIndexKey);
    },
  };
}
