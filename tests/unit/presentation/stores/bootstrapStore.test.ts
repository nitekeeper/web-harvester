// tests/unit/presentation/stores/bootstrapStore.test.ts
//
// Unit tests for `bootstrapStore` — the generic async utility that wires
// chrome.storage sync to an existing Zustand singleton (singletons created
// without `withStorageSync` because their entry points control the adapter).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

import { bootstrapStore } from '@presentation/stores/bootstrapStore';

import { MockAdapter } from '../../../helpers/MockAdapter';

/** Minimal counter store shape used by the tests below. */
interface CounterState {
  count: number;
  label: string;
  increment: () => void;
}

const KEY = 'bootstrap-counter';

function makeCounterStore() {
  return create<CounterState>()((set) => ({
    count: 0,
    label: '',
    increment: (): void => set((s) => ({ count: s.count + 1 })),
  }));
}

let adapter: MockAdapter;

describe('bootstrapStore — initial state hydration', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('loads initial state from storage and applies it to the store', async () => {
    await adapter.setLocal(KEY, { count: 42, label: 'hi' });
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    expect(store.getState().count).toBe(42);
    expect(store.getState().label).toBe('hi');
  });

  it('leaves the store unchanged when storage is empty', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    expect(store.getState().count).toBe(0);
    expect(store.getState().label).toBe('');
  });
});

describe('bootstrapStore — write path persists store changes', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('persists state to storage on every state change after bootstrap', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    store.getState().increment();
    await Promise.resolve();
    const stored = (await adapter.getLocal(KEY)) as Record<string, unknown>;
    expect(stored['count']).toBe(1);
  });

  it('strips function-typed properties from the persisted payload', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    store.getState().increment();
    await Promise.resolve();
    const stored = (await adapter.getLocal(KEY)) as Record<string, unknown>;
    expect(typeof stored['increment']).not.toBe('function');
  });

  it('uses the supplied serialize option to restrict the persisted slice', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store, { serialize: (s) => ({ count: s.count }) });
    store.getState().increment();
    await Promise.resolve();
    const stored = (await adapter.getLocal(KEY)) as Record<string, unknown>;
    expect(stored['count']).toBe(1);
    expect(stored).not.toHaveProperty('label');
  });
});

describe('bootstrapStore — external change application', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('applies external storage.onChanged updates to the store', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    adapter.triggerStorageChange({ [KEY]: { newValue: { count: 99, label: 'ext' } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(99);
    expect(store.getState().label).toBe('ext');
  });

  it('ignores onChanged events for keys other than storageKey', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    adapter.triggerStorageChange({ unrelated: { newValue: { count: 99 } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(0);
  });

  it('does not re-persist external changes (avoids feedback loop)', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    const setLocalSpy = vi.spyOn(adapter, 'setLocal');
    adapter.triggerStorageChange({ [KEY]: { newValue: { count: 7 } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(7);
    expect(setLocalSpy).not.toHaveBeenCalled();
  });
});

describe('bootstrapStore — error handling', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('still wires subscribe + onChanged when initial load rejects', async () => {
    vi.spyOn(adapter, 'getLocal').mockRejectedValueOnce(new Error('boom'));
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);

    // External change still applies even though initial load failed.
    adapter.triggerStorageChange({ [KEY]: { newValue: { count: 5 } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(5);
  });

  it('swallows storage write failures during persistence', async () => {
    const store = makeCounterStore();
    await bootstrapStore(adapter, KEY, store);
    vi.spyOn(adapter, 'setLocal').mockRejectedValueOnce(new Error('quota exceeded'));
    expect(() => store.getState().increment()).not.toThrow();
    await Promise.resolve();
    expect(store.getState().count).toBe(1);
  });
});
