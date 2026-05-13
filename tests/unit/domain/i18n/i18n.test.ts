// tests/unit/domain/i18n/i18n.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { EN_MESSAGES_PATH, SAVE_BUTTON, HIGHLIGHT_COUNT } = vi.hoisted(() => ({
  EN_MESSAGES_PATH: '@domain/i18n/_locales/en/messages.json',
  SAVE_BUTTON: 'save-button',
  HIGHLIGHT_COUNT: 'highlight-count',
}));

// We must mock the dynamic import before importing the module under test.
vi.mock(EN_MESSAGES_PATH, () => ({
  default: {
    [SAVE_BUTTON]: { message: 'Save' },
    'clip-success': { message: 'Clipped to {destination}' },
    [HIGHLIGHT_COUNT]: {
      message: '{count, plural, one {# highlight} other {# highlights}}',
    },
  },
}));

vi.mock('@domain/i18n/_locales/de/messages.json', () => ({
  default: {
    [SAVE_BUTTON]: { message: 'Speichern' },
    'clip-success': { message: 'Gespeichert in {destination}' },
    // HIGHLIGHT_COUNT intentionally omitted to test English fallback
  },
}));

vi.mock('@domain/i18n/_locales/ar/messages.json', () => ({
  default: {
    [SAVE_BUTTON]: { message: 'حفظ' },
  },
}));

vi.mock('@domain/i18n/_locales/ko/messages.json', () => ({
  default: {
    [SAVE_BUTTON]: { message: '저장' },
  },
}));

import { loadLocale, formatMessage, getCurrentLocale, isRTL } from '@domain/i18n/i18n';

beforeEach(async () => {
  // Reset to English before each test.
  await loadLocale('en');
});

describe('loadLocale + formatMessage', () => {
  it('formats a simple English message', async () => {
    await loadLocale('en');
    expect(formatMessage(SAVE_BUTTON)).toBe('Save');
  });

  it('formats a message with a variable substitution', async () => {
    await loadLocale('en');
    expect(formatMessage('clip-success', { destination: 'My Vault' })).toBe('Clipped to My Vault');
  });

  it('formats plural messages correctly for count=1', async () => {
    await loadLocale('en');
    expect(formatMessage(HIGHLIGHT_COUNT, { count: 1 })).toBe('1 highlight');
  });

  it('formats plural messages correctly for count=5', async () => {
    await loadLocale('en');
    expect(formatMessage(HIGHLIGHT_COUNT, { count: 5 })).toBe('5 highlights');
  });

  it('returns the message id for unknown keys', async () => {
    await loadLocale('en');
    expect(formatMessage('no-such-key')).toBe('no-such-key');
  });
});

describe('non-English locale', () => {
  it('returns the German translation after loading de', async () => {
    await loadLocale('de');
    expect(formatMessage(SAVE_BUTTON)).toBe('Speichern');
  });

  it('falls back to English when the key is missing from the loaded locale', async () => {
    await loadLocale('de');
    // 'highlight-count' was omitted from the de mock — expect English fallback.
    expect(formatMessage(HIGHLIGHT_COUNT, { count: 2 })).toBe('2 highlights');
  });

  it('loads an RTL locale (ar) via the glob loader', async () => {
    // Exercises the `./_locales/ar/messages.json` loader emitted by
    // `import.meta.glob` so coverage hits every glob-generated function.
    await loadLocale('ar');
    expect(formatMessage(SAVE_BUTTON)).toBe('حفظ');
  });

  it('loads the ko locale via the glob loader', async () => {
    await loadLocale('ko');
    expect(formatMessage(SAVE_BUTTON)).toBe('저장');
  });
});

describe('getCurrentLocale', () => {
  it('returns "en" by default', async () => {
    await loadLocale('en');
    expect(getCurrentLocale()).toBe('en');
  });

  it('returns "de" after loading de', async () => {
    await loadLocale('de');
    expect(getCurrentLocale()).toBe('de');
  });
});

describe('isRTL', () => {
  it('returns true for ar', () => {
    expect(isRTL('ar')).toBe(true);
  });

  it('returns true for fa', () => {
    expect(isRTL('fa')).toBe(true);
  });

  it('returns true for he', () => {
    expect(isRTL('he')).toBe(true);
  });

  it('returns false for en', () => {
    expect(isRTL('en')).toBe(false);
  });

  it('returns false for de', () => {
    expect(isRTL('de')).toBe(false);
  });

  it('returns false for zh_CN', () => {
    expect(isRTL('zh_CN')).toBe(false);
  });
});

describe('lazy English fallback', () => {
  it('lazy-loads English when the first loadLocale call is non-English', async () => {
    // Reset the i18n module so its `englishMessages` private state is fresh
    // (null), then load `de` first — this exercises the "lazy load English"
    // branch in loadLocale().
    vi.resetModules();
    const fresh = await import('@domain/i18n/i18n');
    await fresh.loadLocale('de');
    // Asking for a German-only key returns German.
    expect(fresh.formatMessage(SAVE_BUTTON)).toBe('Speichern');
    // Asking for a key that only exists in English falls back to English.
    expect(fresh.formatMessage(HIGHLIGHT_COUNT, { count: 3 })).toBe('3 highlights');
  });
});

describe('formatMessage with malformed ICU template', () => {
  it('returns the raw template when IntlMessageFormat throws', async () => {
    // Build a fresh module instance and inject a locale whose ICU template
    // is intentionally malformed. The catch branch must return the template
    // string as-is rather than crashing.
    vi.resetModules();
    vi.doMock(EN_MESSAGES_PATH, () => ({
      default: {
        broken: { message: '{count, plural, one' },
      },
    }));
    const fresh = await import('@domain/i18n/i18n');
    await fresh.loadLocale('en');
    expect(fresh.formatMessage('broken', { count: 1 })).toBe('{count, plural, one');
    vi.doUnmock(EN_MESSAGES_PATH);
  });
});

describe('loadLocale error handling', () => {
  it('throws when no messages bundle is registered for the locale', async () => {
    // 'fr' is in SUPPORTED_LOCALES but has no on-disk messages.json under
    // src/domain/i18n/_locales/, so the static glob map has no entry for it.
    // The runtime guard in loadLocaleModule must surface that as a clear error.
    await expect(loadLocale('fr')).rejects.toThrow(/No messages bundle registered for locale "fr"/);
  });
});

describe('lookup shape validation', () => {
  it('returns the message id when the entry is missing the message field', async () => {
    // Inject a malformed entry (no `message` key) and verify the lookup helper
    // refuses to flow `undefined` into the formatter.
    vi.resetModules();
    vi.doMock(EN_MESSAGES_PATH, () => ({
      default: {
        // Missing required `message` string — must not produce "undefined".
        malformed: { other: 'not a message' },
      },
    }));
    const fresh = await import('@domain/i18n/i18n');
    await fresh.loadLocale('en');
    expect(fresh.formatMessage('malformed')).toBe('malformed');
    vi.doUnmock(EN_MESSAGES_PATH);
  });

  it('returns the message id when the entry is null', async () => {
    vi.resetModules();
    vi.doMock(EN_MESSAGES_PATH, () => ({
      default: {
        nulled: null,
      },
    }));
    const fresh = await import('@domain/i18n/i18n');
    await fresh.loadLocale('en');
    expect(fresh.formatMessage('nulled')).toBe('nulled');
    vi.doUnmock(EN_MESSAGES_PATH);
  });

  it('returns the message id when message is not a string', async () => {
    vi.resetModules();
    vi.doMock(EN_MESSAGES_PATH, () => ({
      default: {
        numeric: { message: 42 },
      },
    }));
    const fresh = await import('@domain/i18n/i18n');
    await fresh.loadLocale('en');
    expect(fresh.formatMessage('numeric')).toBe('numeric');
    vi.doUnmock(EN_MESSAGES_PATH);
  });
});
