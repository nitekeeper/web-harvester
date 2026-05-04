import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ReaderService, type IReaderService } from '@application/ReaderService';
import { createLogger } from '@shared/logger';

/**
 * Builds a minimal mock tab adapter whose surface matches the slice of
 * `IReaderTabAdapterPort` that `ReaderService` actually exercises.
 */
function createMockTabAdapter() {
  return {
    insertCSS: vi.fn().mockResolvedValue(undefined),
    removeCSS: vi.fn().mockResolvedValue(undefined),
  };
}

let tabAdapter: ReturnType<typeof createMockTabAdapter>;
let service: IReaderService;

beforeEach(() => {
  vi.clearAllMocks();
  tabAdapter = createMockTabAdapter();
  service = new ReaderService(tabAdapter, createLogger('test'));
});

describe('ReaderService — toggle()', () => {
  it('activates reader mode on first toggle — injects CSS via insertCSS', async () => {
    await service.toggle(42);
    expect(tabAdapter.insertCSS).toHaveBeenCalledWith(42, expect.stringContaining('max-width'));
    expect(service.isActive(42)).toBe(true);
  });

  it('deactivates reader mode on second toggle — removes CSS via removeCSS', async () => {
    await service.toggle(42); // activate
    await service.toggle(42); // deactivate
    expect(tabAdapter.removeCSS).toHaveBeenCalledWith(42, expect.stringContaining('max-width'));
    expect(service.isActive(42)).toBe(false);
  });

  it('tracks state independently per tab', async () => {
    await service.toggle(1);
    await service.toggle(2);
    await service.toggle(2); // deactivate tab 2
    expect(service.isActive(1)).toBe(true);
    expect(service.isActive(2)).toBe(false);
  });
});

describe('ReaderService — isActive()', () => {
  it('returns false for a tab that has never been toggled', () => {
    expect(service.isActive(99)).toBe(false);
  });

  it('returns true after activation and false after deactivation', async () => {
    expect(service.isActive(42)).toBe(false);
    await service.toggle(42);
    expect(service.isActive(42)).toBe(true);
    await service.toggle(42);
    expect(service.isActive(42)).toBe(false);
  });
});

describe('ReaderService — getState()', () => {
  it('returns isActive false and tabId undefined when no tab is active', () => {
    const state = service.getState();
    expect(state.isActive).toBe(false);
    expect(state.tabId).toBeUndefined();
  });

  it('returns isActive true and the tabId of the most recently toggled tab', async () => {
    await service.toggle(42);
    const state = service.getState();
    expect(state.isActive).toBe(true);
    expect(state.tabId).toBe(42);
  });

  it('reflects deactivation in getState()', async () => {
    await service.toggle(42);
    await service.toggle(42);
    const state = service.getState();
    expect(state.isActive).toBe(false);
  });
});
