import { beforeEach, describe, expect, it } from 'vitest';

import { usePopupStore } from '@presentation/stores/usePopupStore';

describe('usePopupStore — isReaderActive', () => {
  beforeEach(() => {
    usePopupStore.setState({ isReaderActive: false });
  });

  it('starts with isReaderActive false', () => {
    expect(usePopupStore.getState().isReaderActive).toBe(false);
  });

  it('setReaderActive(true) sets isReaderActive to true', () => {
    usePopupStore.getState().setReaderActive(true);
    expect(usePopupStore.getState().isReaderActive).toBe(true);
  });

  it('setReaderActive(false) sets isReaderActive back to false', () => {
    usePopupStore.getState().setReaderActive(true);
    usePopupStore.getState().setReaderActive(false);
    expect(usePopupStore.getState().isReaderActive).toBe(false);
  });
});
