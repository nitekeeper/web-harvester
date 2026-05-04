/**
 * Browser storage adapter — abstracts persistent key/value storage across
 * `local` and `sync` storage areas, plus change subscriptions. Concrete
 * implementations wrap `chrome.storage.*`.
 */
export interface IStorageAdapter {
  getLocal(key: string): Promise<unknown>;
  setLocal(key: string, value: unknown): Promise<void>;
  removeLocal(key: string): Promise<void>;
  getSync(key: string): Promise<unknown>;
  setSync(key: string, value: unknown): Promise<void>;
  removeSync(key: string): Promise<void>;
  onChanged(
    handler: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
  ): void;
}
