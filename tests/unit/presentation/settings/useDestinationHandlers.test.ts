// tests/unit/presentation/settings/useDestinationHandlers.test.ts
//
// Unit tests for `useDestinationHandlers` — the hook that composes the
// FSA picker, the destination storage facade, and the settings store
// for the settings page's destinations section.

import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDestinationPort } from '@presentation/ports/IDestinationPort';
import { DestinationStorageProvider } from '@presentation/settings/DestinationStorageContext';
import { useDestinationHandlers } from '@presentation/settings/useDestinationHandlers';
import { useSettingsStore, type DestinationView } from '@presentation/stores/useSettingsStore';

/** Builds a `DestinationView`-shaped fixture. */
function makeDest(overrides: Partial<DestinationView> = {}): DestinationView {
  return {
    id: 'd1',
    label: 'Notes',
    dirHandle: { name: 'Notes' } as FileSystemDirectoryHandle,
    fileNamePattern: '{date} {title}.md',
    createdAt: 0,
    ...overrides,
  };
}

/** Builds a fresh stub `IDestinationPort` whose calls are recorded. */
function makeStorage(): IDestinationPort {
  return {
    add: vi.fn(async (label, dirHandle) =>
      makeDest({ id: 'new', label, dirHandle: dirHandle as FileSystemDirectoryHandle }),
    ),
    getAll: vi.fn(async () => [makeDest({ id: 'd1', label: 'Notes' })]),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

function wrapper(storage: IDestinationPort) {
  return ({ children }: { children: ReactNode }) =>
    createElement(DestinationStorageProvider, { storage, children });
}

beforeEach(() => {
  // Reset singleton between tests so destinations don't leak.
  useSettingsStore.setState({ destinations: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDestinationHandlers — onAdd', () => {
  it('opens the FSA picker, calls storage.add with name+handle, and refreshes the store', async () => {
    const storage = makeStorage();
    const dirHandle = { name: 'My Vault' } as FileSystemDirectoryHandle;
    Reflect.set(window, 'showDirectoryPicker', vi.fn().mockResolvedValue(dirHandle));

    const { result } = renderHook(() => useDestinationHandlers(), { wrapper: wrapper(storage) });
    await act(async () => {
      await result.current.onAdd();
    });

    expect(storage.add).toHaveBeenCalledWith('My Vault', dirHandle);
    expect(storage.getAll).toHaveBeenCalled();
    expect(useSettingsStore.getState().destinations).toHaveLength(1);
  });

  it('is a graceful no-op when no storage is provided in context', async () => {
    Reflect.set(window, 'showDirectoryPicker', vi.fn());
    const { result } = renderHook(() => useDestinationHandlers());
    await act(async () => {
      await result.current.onAdd();
    });
    // No exception, store stays empty.
    expect(useSettingsStore.getState().destinations).toEqual([]);
  });
});

describe('useDestinationHandlers — onRemove', () => {
  it('calls storage.remove and refreshes the destinations list in the store', async () => {
    const storage = makeStorage();
    const { result } = renderHook(() => useDestinationHandlers(), { wrapper: wrapper(storage) });
    await act(async () => {
      await result.current.onRemove('d1');
    });
    expect(storage.remove).toHaveBeenCalledWith('d1');
    expect(storage.getAll).toHaveBeenCalled();
    expect(useSettingsStore.getState().destinations).toHaveLength(1);
  });

  it('is a graceful no-op when no storage is provided in context', async () => {
    const { result } = renderHook(() => useDestinationHandlers());
    await act(async () => {
      await result.current.onRemove('d1');
    });
    expect(useSettingsStore.getState().destinations).toEqual([]);
  });
});

describe('useDestinationHandlers — onRename', () => {
  it('calls storage.update with the new label and refreshes the store', async () => {
    const storage = makeStorage();
    const { result } = renderHook(() => useDestinationHandlers(), { wrapper: wrapper(storage) });
    await act(async () => {
      await result.current.onRename('d1', 'Renamed');
    });
    expect(storage.update).toHaveBeenCalledWith('d1', { label: 'Renamed' });
    expect(storage.getAll).toHaveBeenCalled();
    expect(useSettingsStore.getState().destinations).toHaveLength(1);
  });
});
