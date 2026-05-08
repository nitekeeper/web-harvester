import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  ReaderService,
  type IReaderService,
  defaultReaderSettings,
} from '@application/ReaderService';
import { createLogger } from '@shared/logger';

function createMockTabAdapter() {
  return {
    sendMessageToTab: vi.fn().mockResolvedValue(undefined),
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
  it('sends READER_ACTIVATE with settings on first toggle', async () => {
    const settings = defaultReaderSettings();
    await service.toggle(42, settings);
    expect(tabAdapter.sendMessageToTab).toHaveBeenCalledWith(42, {
      type: 'READER_ACTIVATE',
      settings,
    });
    expect(service.isActive(42)).toBe(true);
  });

  it('sends READER_DEACTIVATE on second toggle', async () => {
    await service.toggle(42, defaultReaderSettings());
    await service.toggle(42, defaultReaderSettings());
    expect(tabAdapter.sendMessageToTab).toHaveBeenLastCalledWith(42, {
      type: 'READER_DEACTIVATE',
    });
    expect(service.isActive(42)).toBe(false);
  });

  it('tracks state independently per tab', async () => {
    await service.toggle(1, defaultReaderSettings());
    await service.toggle(2, defaultReaderSettings());
    await service.toggle(2, defaultReaderSettings());
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
    await service.toggle(42, defaultReaderSettings());
    expect(service.isActive(42)).toBe(true);
    await service.toggle(42, defaultReaderSettings());
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
    await service.toggle(42, defaultReaderSettings());
    const state = service.getState();
    expect(state.isActive).toBe(true);
    expect(state.tabId).toBe(42);
  });

  it('reflects deactivation in getState()', async () => {
    await service.toggle(42, defaultReaderSettings());
    await service.toggle(42, defaultReaderSettings());
    const state = service.getState();
    expect(state.isActive).toBe(false);
  });
});
