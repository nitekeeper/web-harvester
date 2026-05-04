import { describe, it, expect, vi } from 'vitest';

import {
  createAsyncWaterfallHook,
  createAsyncBailHook,
  createAsyncEventHook,
  createSyncEventHook,
  createHookSystem,
} from '@core/hooks';

const TAP_A = 'a';
const TAP_B = 'b';
const INPUT_X = 'x';

// Shared test names — used across multiple hook variants to keep behaviour names consistent.
const TEST_UNTAP_REMOVES = 'untap removes the handler';
const TEST_REPLACES_EXISTING = 'replaces existing tap with same id';

describe('AsyncWaterfallHook — execution', () => {
  it('passes value through handlers in order', async () => {
    const hook = createAsyncWaterfallHook<number>();
    hook.tap(TAP_A, async (v) => v + 1);
    hook.tap(TAP_B, async (v) => v * 2);
    const result = await hook.call(5);
    expect(result).toBe(12); // (5+1)*2
  });

  it('respects priority ordering (higher priority runs first)', async () => {
    const order: string[] = [];
    const hook = createAsyncWaterfallHook<string>();
    hook.tap(
      'low',
      async (v) => {
        order.push('low');
        return v;
      },
      { priority: 0 },
    );
    hook.tap(
      'high',
      async (v) => {
        order.push('high');
        return v;
      },
      { priority: 10 },
    );
    await hook.call(INPUT_X);
    expect(order).toEqual(['high', 'low']);
  });

  it('isolates errors — skips failing handler, continues with previous value', async () => {
    const hook = createAsyncWaterfallHook<number>();
    hook.tap('fail', async () => {
      throw new Error('boom');
    });
    hook.tap('ok', async (v) => v + 1);
    const result = await hook.call(5);
    expect(result).toBe(6); // failing handler skipped, value stays 5, then +1
  });
});

describe('AsyncWaterfallHook — tap management', () => {
  it('replaces an existing tap with the same id (dedup)', async () => {
    const hook = createAsyncWaterfallHook<number>();
    hook.tap('a', async (v) => v + 1);
    hook.tap('a', async (v) => v + 10); // replaces the first
    const result = await hook.call(0);
    expect(result).toBe(10); // only the second tap runs
  });

  it(TEST_UNTAP_REMOVES, async () => {
    const hook = createAsyncWaterfallHook<number>();
    hook.tap('a', async (v) => v + 1);
    hook.untap('a');
    const result = await hook.call(5);
    expect(result).toBe(5); // no handlers, value unchanged
  });

  it('maintains registration order for equal-priority taps', async () => {
    const order: string[] = [];
    const hook = createAsyncWaterfallHook<string>();
    hook.tap(
      'first',
      async (v) => {
        order.push('first');
        return v;
      },
      { priority: 5 },
    );
    hook.tap(
      'second',
      async (v) => {
        order.push('second');
        return v;
      },
      { priority: 5 },
    );
    await hook.call('x');
    expect(order).toEqual(['first', 'second']); // registration order preserved for same priority
  });
});

describe('AsyncBailHook — execution', () => {
  it('returns true when no handler bails', async () => {
    const hook = createAsyncBailHook<string>();
    hook.tap(TAP_A, async () => undefined);
    hook.tap(TAP_B, async () => undefined);
    const result = await hook.call('test');
    expect(result).toBe(true);
  });

  it('returns false when a handler returns false', async () => {
    const hook = createAsyncBailHook<string>();
    hook.tap('validator', async (v) => (v.length > 0 ? undefined : false));
    const result = await hook.call('');
    expect(result).toBe(false);
  });

  it('stops executing after a bail', async () => {
    const afterBail = vi.fn();
    const hook = createAsyncBailHook<string>();
    hook.tap('bail', async () => false);
    hook.tap('after', async () => {
      afterBail();
      return undefined;
    });
    await hook.call(INPUT_X);
    expect(afterBail).not.toHaveBeenCalled();
  });

  it('continues when a handler throws (error isolation)', async () => {
    const afterError = vi.fn();
    const hook = createAsyncBailHook<string>();
    hook.tap('throws', async () => {
      throw new Error('oops');
    });
    hook.tap('after', async () => {
      afterError();
      return undefined;
    });
    const result = await hook.call('test');
    expect(result).toBe(true);
    expect(afterError).toHaveBeenCalled();
  });
});

describe('AsyncBailHook — tap management', () => {
  it('replaces an existing tap with the same id (dedup)', async () => {
    const hook = createAsyncBailHook<string>();
    hook.tap('a', async () => false); // first: bails
    hook.tap('a', async () => undefined); // replaces: does not bail
    const result = await hook.call('test');
    expect(result).toBe(true); // replaced tap doesn't bail
  });

  it(TEST_UNTAP_REMOVES, async () => {
    const hook = createAsyncBailHook<string>();
    hook.tap('bail', async () => false);
    hook.untap('bail');
    const result = await hook.call('test');
    expect(result).toBe(true); // no handlers left, returns true
  });
});

describe('AsyncEventHook — execution', () => {
  it('notifies all handlers with the value', async () => {
    const received: number[] = [];
    const hook = createAsyncEventHook<number>();
    hook.tap('a', async (v) => {
      received.push(v);
    });
    hook.tap('b', async (v) => {
      received.push(v * 2);
    });
    await hook.call(5);
    expect(received).toContain(5);
    expect(received).toContain(10);
  });

  it('continues after a handler throws', async () => {
    const secondCalled = vi.fn();
    const hook = createAsyncEventHook<string>();
    hook.tap('fail', async () => {
      throw new Error('boom');
    });
    hook.tap('ok', async () => {
      secondCalled();
    });
    await hook.call('x');
    expect(secondCalled).toHaveBeenCalled();
  });
});

describe('AsyncEventHook — tap management', () => {
  it(TEST_REPLACES_EXISTING, async () => {
    const received: string[] = [];
    const hook = createAsyncEventHook<string>();
    hook.tap('a', async () => {
      received.push('first');
    });
    hook.tap('a', async () => {
      received.push('second');
    }); // replaces
    await hook.call('x');
    expect(received).toEqual(['second']);
  });

  it(TEST_UNTAP_REMOVES, async () => {
    const called = vi.fn();
    const hook = createAsyncEventHook<string>();
    hook.tap('a', async () => {
      called();
    });
    hook.untap('a');
    await hook.call('x');
    expect(called).not.toHaveBeenCalled();
  });
});

describe('SyncEventHook — execution', () => {
  it('calls all sync handlers in registration order', () => {
    const received: string[] = [];
    const hook = createSyncEventHook<string>();
    hook.tap('a', (v) => {
      received.push(v);
    });
    hook.tap('b', (v) => {
      received.push(v + '!');
    });
    hook.call('hello');
    expect(received).toEqual(['hello', 'hello!']);
  });

  it('continues after a handler throws', () => {
    const secondCalled = vi.fn();
    const hook = createSyncEventHook<string>();
    hook.tap('fail', () => {
      throw new Error('sync fail');
    });
    hook.tap('ok', () => {
      secondCalled();
    });
    hook.call('x');
    expect(secondCalled).toHaveBeenCalled();
  });
});

describe('SyncEventHook — tap management', () => {
  it(TEST_REPLACES_EXISTING, () => {
    const received: string[] = [];
    const hook = createSyncEventHook<string>();
    hook.tap('a', () => {
      received.push('first');
    });
    hook.tap('a', () => {
      received.push('second');
    }); // replaces
    hook.call('x');
    expect(received).toEqual(['second']);
  });

  it(TEST_UNTAP_REMOVES, () => {
    const called = vi.fn();
    const hook = createSyncEventHook<string>();
    hook.tap('a', () => {
      called();
    });
    hook.untap('a');
    hook.call('x');
    expect(called).not.toHaveBeenCalled();
  });
});

describe('createHookSystem', () => {
  it('creates a hook system with all required hooks', () => {
    const hooks = createHookSystem();
    expect(hooks.beforeClip).toBeDefined();
    expect(hooks.afterClip).toBeDefined();
    expect(hooks.beforeSave).toBeDefined();
    expect(hooks.afterSave).toBeDefined();
    expect(hooks.onTemplateRender).toBeDefined();
    expect(hooks.onHighlight).toBeDefined();
    expect(hooks.onSettingsChanged).toBeDefined();
    expect(hooks.onThemeChanged).toBeDefined();
    expect(hooks.onPopupOpen).toBeDefined();
    expect(hooks.onPluginActivate).toBeDefined();
    expect(hooks.onPluginDeactivate).toBeDefined();
  });
});
