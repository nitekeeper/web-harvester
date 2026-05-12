// tests/unit/presentation/i18n/bootstrapLocale.test.ts
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadLocale } from '@application/i18n/localeService';
import { bootstrapLocale } from '@presentation/i18n/bootstrapLocale';
import type { LocaleStoreState } from '@presentation/stores/useLocaleStore';
import { useLocaleStore } from '@presentation/stores/useLocaleStore';
import type { SettingsStoreState } from '@presentation/stores/useSettingsStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

// --- mocks ---

vi.mock('@application/i18n/localeService', () => ({
  loadLocale: vi.fn(),
}));

vi.mock('@presentation/stores/useLocaleStore', () => ({
  useLocaleStore: { getState: vi.fn() },
}));

vi.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: Object.assign(vi.fn(), { subscribe: vi.fn() }),
}));

// --- typed handles ---

const mockLoadLocale = loadLocale as MockedFunction<typeof loadLocale>;

/** Typed handle to the mocked locale store's static method. */
interface MockedLocaleStore {
  /** Returns the current locale store state snapshot. */
  getState: MockedFunction<() => LocaleStoreState>;
}
const mockedLocaleStore = useLocaleStore as unknown as MockedLocaleStore;

/** Callback shape passed to `useSettingsStore.subscribe`. */
type StoreSubscriber = (state: SettingsStoreState) => void;

/** Typed handle to the mocked settings store's subscribe method. */
interface MockedSettingsStore {
  /** Subscribes to store state changes. */
  subscribe: MockedFunction<(cb: StoreSubscriber) => () => void>;
}
const mockedSettingsStore = useSettingsStore as unknown as MockedSettingsStore;

// --- helpers ---

const mockSetLocale = vi.fn();
const mockUnsubscribe = vi.fn();

/** Builds a minimal SettingsStoreState fixture with the given locale. */
function makeSettingsState(locale: string): SettingsStoreState {
  return { settings: { locale } } as unknown as SettingsStoreState;
}

/** Wires up getState and subscribe mocks; returns a trigger helper for tests. */
function setupMocks(): { triggerSubscriber: (state: SettingsStoreState) => void } {
  let capturedCb: StoreSubscriber | null = null;
  mockedLocaleStore.getState.mockReturnValue({ locale: 'en', setLocale: mockSetLocale });
  mockedSettingsStore.subscribe.mockImplementation((cb: StoreSubscriber) => {
    capturedCb = cb;
    return mockUnsubscribe;
  });
  return { triggerSubscriber: (state) => capturedCb?.(state) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockLoadLocale.mockResolvedValue(undefined);
});

const BUNDLE_MISSING_ERR = new Error('bundle missing');

// --- tests ---

describe('bootstrapLocale — initial load', () => {
  it('calls loadLocale with the validated locale', async () => {
    setupMocks();
    await bootstrapLocale('de');
    expect(mockLoadLocale).toHaveBeenCalledWith('de');
  });

  it('calls setLocale with the validated locale after loadLocale resolves', async () => {
    setupMocks();
    await bootstrapLocale('de');
    expect(mockSetLocale).toHaveBeenCalledWith('de');
  });

  it('falls back to "en" when rawLocale is not in SUPPORTED_LOCALES', async () => {
    setupMocks();
    await bootstrapLocale('xx-UNKNOWN');
    expect(mockLoadLocale).toHaveBeenCalledWith('en');
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('registers a subscription on useSettingsStore and returns the unsubscribe function', async () => {
    setupMocks();
    const cleanup = await bootstrapLocale('en');
    expect(mockedSettingsStore.subscribe).toHaveBeenCalledOnce();
    expect(cleanup).toBe(mockUnsubscribe);
  });
});

describe('bootstrapLocale — initial load error handling', () => {
  it('does not call setLocale when loadLocale throws', async () => {
    setupMocks();
    mockLoadLocale.mockRejectedValue(BUNDLE_MISSING_ERR);
    await bootstrapLocale('en');
    expect(mockSetLocale).not.toHaveBeenCalled();
  });

  it('falls back to "en" when a non-en locale bundle fails to load', async () => {
    setupMocks();
    mockLoadLocale.mockRejectedValueOnce(BUNDLE_MISSING_ERR).mockResolvedValueOnce(undefined);
    await bootstrapLocale('ko');
    expect(mockLoadLocale).toHaveBeenCalledWith('ko');
    expect(mockLoadLocale).toHaveBeenCalledWith('en');
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('does not attempt en fallback when "en" itself fails to load', async () => {
    setupMocks();
    mockLoadLocale.mockRejectedValue(BUNDLE_MISSING_ERR);
    await bootstrapLocale('en');
    expect(mockLoadLocale).toHaveBeenCalledTimes(1);
    expect(mockSetLocale).not.toHaveBeenCalled();
  });
});

describe('bootstrapLocale — subscription locale changes', () => {
  it('calls loadLocale with the new locale when settings locale changes', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    mockLoadLocale.mockClear();
    triggerSubscriber(makeSettingsState('ko'));
    await vi.waitFor(() => expect(mockLoadLocale).toHaveBeenCalledWith('ko'));
  });

  it('calls setLocale with the new locale after the bundle resolves', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    mockSetLocale.mockClear();
    triggerSubscriber(makeSettingsState('de'));
    await vi.waitFor(() => expect(mockSetLocale).toHaveBeenCalledWith('de'));
  });

  it('skips reload when the locale has not changed', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    mockLoadLocale.mockClear();
    triggerSubscriber(makeSettingsState('en'));
    await Promise.resolve(); // flush microtask queue
    expect(mockLoadLocale).not.toHaveBeenCalled();
  });
});

describe('bootstrapLocale — subscription fallback and error handling', () => {
  it('falls back to "en" for an unknown locale in settings', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    mockLoadLocale.mockClear();
    mockSetLocale.mockClear();
    triggerSubscriber(makeSettingsState('zz-UNKNOWN'));
    await vi.waitFor(() => {
      expect(mockLoadLocale).toHaveBeenCalledWith('en');
      expect(mockSetLocale).toHaveBeenCalledWith('en');
    });
  });

  it('reloads for a second unknown locale even when both resolve to "en"', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    // First unknown locale → triggers applyLocale('en')
    triggerSubscriber(makeSettingsState('xx-UNKNOWN'));
    await vi.waitFor(() => expect(mockLoadLocale).toHaveBeenCalledWith('en'));
    mockLoadLocale.mockClear();
    mockSetLocale.mockClear();
    // Second different unknown locale → must also trigger applyLocale('en')
    triggerSubscriber(makeSettingsState('yy-ALSO-UNKNOWN'));
    await vi.waitFor(() => {
      expect(mockLoadLocale).toHaveBeenCalledWith('en');
      expect(mockSetLocale).toHaveBeenCalledWith('en');
    });
  });

  it('does not update locale store when subscription loadLocale throws', async () => {
    const { triggerSubscriber } = setupMocks();
    await bootstrapLocale('en');
    mockLoadLocale.mockRejectedValue(new Error('bundle missing'));
    mockSetLocale.mockClear();
    triggerSubscriber(makeSettingsState('de'));
    await vi.waitFor(() => expect(mockLoadLocale).toHaveBeenCalledWith('de'));
    expect(mockSetLocale).not.toHaveBeenCalled();
  });
});
