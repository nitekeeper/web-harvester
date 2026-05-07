import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultReaderSettings } from '@application/ReaderService';
import { createReaderStore } from '@presentation/stores/useReaderStore';

function createMockAdapter() {
  const store = new Map<string, unknown>();
  return {
    getLocal: vi.fn(async (key: string) => store.get(key) ?? undefined),
    setLocal: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    removeLocal: vi.fn(),
    getSync: vi.fn(),
    setSync: vi.fn(),
    removeSync: vi.fn(),
    onChanged: vi.fn(() => ({ remove: vi.fn() })),
  };
}

describe('useReaderStore', () => {
  let store: ReturnType<typeof createReaderStore>;

  beforeEach(() => {
    store = createReaderStore(createMockAdapter());
  });

  it('starts with default reader settings', () => {
    expect(store.getState().settings).toEqual(defaultReaderSettings());
  });

  it('setSettings merges a partial patch (single field)', () => {
    store.getState().setSettings({ fontSize: 20 });
    expect(store.getState().settings.fontSize).toBe(20);
    expect(store.getState().settings.lineHeight).toBe(defaultReaderSettings().lineHeight);
  });

  it('setSettings merges a partial patch (multiple fields)', () => {
    store.getState().setSettings({ fontSize: 18, theme: 'dark' });
    expect(store.getState().settings.fontSize).toBe(18);
    expect(store.getState().settings.theme).toBe('dark');
  });

  it('setSettings does not affect unrelated fields', () => {
    store.getState().setSettings({ showHighlights: false });
    expect(store.getState().settings.fontFamily).toBe(defaultReaderSettings().fontFamily);
  });
});
