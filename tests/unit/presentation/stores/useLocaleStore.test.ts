import { beforeEach, describe, expect, it } from 'vitest';

import { useLocaleStore } from '@presentation/stores/useLocaleStore';

describe('useLocaleStore', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' });
  });

  it('starts with locale "en"', () => {
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('setLocale updates the active locale', () => {
    useLocaleStore.getState().setLocale('de');
    expect(useLocaleStore.getState().locale).toBe('de');
  });

  it('setLocale to same value is a no-op that does not change reference', () => {
    const before = useLocaleStore.getState();
    useLocaleStore.getState().setLocale('en');
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(useLocaleStore.getState()).not.toBe(before);
  });
});
