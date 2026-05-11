// tests/unit/presentation/theme/bootstrapCustomCss.test.ts

import { type MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsStoreState } from '@presentation/stores/useSettingsStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapCustomCss } from '@presentation/theme/bootstrapCustomCss';

vi.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(vi.fn(), {
    getState: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

/** Callback shape passed to `useSettingsStore.subscribe`. */
type StoreSubscriber = (state: SettingsStoreState) => void;

/** Typed handle to the mocked store's static methods. */
interface MockedStore {
  /** Returns the current store state snapshot. */
  getState: MockedFunction<() => SettingsStoreState>;
  /** Subscribes to store state changes. */
  subscribe: MockedFunction<(cb: StoreSubscriber) => () => void>;
}

const mockedStore = useSettingsStore as unknown as MockedStore;

const CSS_ACCENT = ':root { --wh-accent: #a78bfa; }';
const CSS_RED = 'body { color: red; }';
const CSS_BLUE = 'body { color: blue; }';
const THEME_DARK = 'dark';
const THEME_CUSTOM = 'custom';

/** Builds a minimal SettingsStoreState fixture. */
function makeState(theme: string, customCss: string): SettingsStoreState {
  return { settings: { theme, customCss } } as unknown as SettingsStoreState;
}

/** Wires up getState and subscribe mocks; returns helpers for test control. */
function setupMocks(
  theme: string,
  customCss: string,
): {
  triggerSubscriber: (state: SettingsStoreState) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
} {
  const unsubscribe = vi.fn();
  let capturedCb: StoreSubscriber | null = null;

  mockedStore.getState.mockReturnValue(makeState(theme, customCss));
  mockedStore.subscribe.mockImplementation((cb: StoreSubscriber) => {
    capturedCb = cb;
    return unsubscribe;
  });

  return {
    triggerSubscriber: (state: SettingsStoreState) => capturedCb?.(state),
    unsubscribe,
  };
}

/** Returns the injected style element, asserts it exists. */
function getStyleEl(): HTMLStyleElement {
  const el = document.getElementById('wh-custom-css') as HTMLStyleElement;
  expect(el).not.toBeNull();
  return el;
}

describe('bootstrapCustomCss — initial state', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('injects customCss into style element when initial theme is custom', () => {
    setupMocks(THEME_CUSTOM, CSS_ACCENT);
    bootstrapCustomCss();
    expect(getStyleEl().textContent).toBe(CSS_ACCENT);
  });

  it('leaves style element empty when initial theme is not custom', () => {
    setupMocks(THEME_DARK, CSS_ACCENT);
    bootstrapCustomCss();
    expect(getStyleEl().textContent).toBe('');
  });
});

describe('bootstrapCustomCss — live subscription', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('updates style element when theme switches to custom', () => {
    const { triggerSubscriber } = setupMocks(THEME_DARK, CSS_RED);
    bootstrapCustomCss();
    triggerSubscriber(makeState(THEME_CUSTOM, CSS_RED));
    expect(getStyleEl().textContent).toBe(CSS_RED);
  });

  it('empties style element when theme switches away from custom', () => {
    const { triggerSubscriber } = setupMocks(THEME_CUSTOM, CSS_RED);
    bootstrapCustomCss();
    triggerSubscriber(makeState(THEME_DARK, CSS_RED));
    expect(getStyleEl().textContent).toBe('');
  });

  it('updates style element when customCss changes while theme stays custom', () => {
    const { triggerSubscriber } = setupMocks(THEME_CUSTOM, CSS_RED);
    bootstrapCustomCss();
    triggerSubscriber(makeState(THEME_CUSTOM, CSS_BLUE));
    expect(getStyleEl().textContent).toBe(CSS_BLUE);
  });

  it('skips DOM update when neither theme nor customCss changed', () => {
    const { triggerSubscriber } = setupMocks(THEME_DARK, '');
    bootstrapCustomCss();
    getStyleEl().textContent = 'sentinel';
    triggerSubscriber(makeState(THEME_DARK, ''));
    expect(getStyleEl().textContent).toBe('sentinel');
  });

  it('returns the unsubscribe function from the store', () => {
    const { unsubscribe } = setupMocks(THEME_DARK, '');
    const cleanup = bootstrapCustomCss();
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
