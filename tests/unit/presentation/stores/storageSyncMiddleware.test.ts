// tests/unit/presentation/stores/storageSyncMiddleware.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand';

import { withStorageSync } from '@presentation/stores/storageSyncMiddleware';

import { MockAdapter } from '../../../helpers/MockAdapter';

/** State shape used by every test below. */
interface CounterState {
  count: number;
  increment: () => void;
}

const KEY = 'counter';

const counterSlice =
  (set: (partial: (s: CounterState) => Partial<CounterState>) => void) => (): CounterState => ({
    count: 0,
    increment: (): void => set((s) => ({ count: s.count + 1 })),
  });

function makeCounterStore(adapter: MockAdapter) {
  return createStore<CounterState>()(
    withStorageSync<CounterState>(KEY, adapter)((set) => counterSlice(set)()),
  );
}

describe('withStorageSync middleware — write path', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('writes state to storage on every state change', async () => {
    const store = makeCounterStore(adapter);
    store.getState().increment();
    await Promise.resolve();
    const stored = await adapter.getLocal(KEY);
    expect((stored as { count: number }).count).toBe(1);
  });

  it('does not write functions to storage', async () => {
    const store = makeCounterStore(adapter);
    store.getState().increment();
    await Promise.resolve();
    const stored = (await adapter.getLocal(KEY)) as Record<string, unknown>;
    expect(typeof stored['increment']).not.toBe('function');
  });
});

describe('withStorageSync middleware — read path', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('loads initial state from storage when available', async () => {
    await adapter.setLocal(KEY, { count: 42 });
    const store = makeCounterStore(adapter);
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().count).toBe(42);
  });

  it('patches store state when storage.onChanged fires', async () => {
    const store = makeCounterStore(adapter);
    adapter.triggerStorageChange({ [KEY]: { newValue: { count: 99 } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(99);
  });

  it('ignores storage.onChanged for a different key', async () => {
    const store = makeCounterStore(adapter);
    adapter.triggerStorageChange({ unrelated: { newValue: { count: 99 } } });
    await Promise.resolve();
    expect(store.getState().count).toBe(0);
  });
});

describe('withStorageSync middleware — error & edge cases', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('swallows storage write failures without throwing', async () => {
    const store = makeCounterStore(adapter);

    // Make setLocal throw on the next write.
    vi.spyOn(adapter, 'setLocal').mockRejectedValueOnce(new Error('quota exceeded'));

    // Should not throw.
    expect(() => store.getState().increment()).not.toThrow();
    await Promise.resolve();
    // Store state is still updated even if persistence fails.
    expect(store.getState().count).toBe(1);
  });

  it('ignores storage.onChanged when newValue is null', async () => {
    const store = makeCounterStore(adapter);

    // Simulate a deletion event (newValue is undefined).
    adapter.triggerStorageChange({
      [KEY]: { oldValue: { count: 5 }, newValue: undefined },
    });

    await Promise.resolve();
    expect(store.getState().count).toBe(0);
  });
});
