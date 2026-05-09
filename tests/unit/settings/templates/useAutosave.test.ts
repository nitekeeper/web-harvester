import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAutosave } from '@presentation/settings/sections/templates/useAutosave';

function setup(delayMs = 800) {
  const save = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useAutosave(save, delayMs));
  return { save, hook };
}

describe('useAutosave — initial state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle status', () => {
    const { hook } = setup();
    expect(hook.result.current.status).toBe('idle');
  });
});

describe('useAutosave — debounce timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call save before the delay', () => {
    const { save, hook } = setup();
    act(() => {
      hook.result.current.trigger();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('calls save after the debounce delay', async () => {
    const { save, hook } = setup();
    act(() => {
      hook.result.current.trigger();
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush() calls save immediately', async () => {
    const { save, hook } = setup();
    act(() => {
      hook.result.current.trigger();
    });
    await act(async () => {
      hook.result.current.flush();
    });
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('useAutosave — happy-path status cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions status: idle → saving → saved → idle', async () => {
    let resolveSave!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveSave = res;
        }),
    );
    const { result } = renderHook(() => useAutosave(save, 800));
    act(() => {
      result.current.trigger();
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.status).toBe('saving');
    await act(async () => {
      resolveSave();
    });
    expect(result.current.status).toBe('saved');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.status).toBe('idle');
  });
});

describe('useAutosave — error handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets error status when save rejects', async () => {
    const save = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAutosave(save, 800));
    act(() => {
      result.current.trigger();
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.status).toBe('error');
  });
});
