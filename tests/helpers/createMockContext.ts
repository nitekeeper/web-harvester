import { vi } from 'vitest';

import { createHookSystem } from '@core/hooks';
import type { IPluginContext } from '@domain/types';

/** Creates a fully-stubbed IPluginContext for plugin unit tests. */
export function createMockContext(overrides?: Partial<IPluginContext>): IPluginContext {
  return {
    hooks: createHookSystem(),
    container: { get: vi.fn(), bind: vi.fn() } as unknown as IPluginContext['container'],
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    storage: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      addToSlot: vi.fn(),
      registerComponent: vi.fn(),
      getComponent: vi.fn(),
      registerThemeTokens: vi.fn(),
    },
    ...overrides,
  };
}
