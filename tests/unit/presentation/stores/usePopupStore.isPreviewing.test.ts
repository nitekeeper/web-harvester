import { beforeEach, describe, expect, it } from 'vitest';

import { usePopupStore } from '@presentation/stores/usePopupStore';

describe('usePopupStore — isPreviewing', () => {
  beforeEach(() => {
    usePopupStore.setState({ isPreviewing: false });
  });

  it('starts with isPreviewing false', () => {
    expect(usePopupStore.getState().isPreviewing).toBe(false);
  });

  it('setIsPreviewing(true) sets isPreviewing to true', () => {
    usePopupStore.getState().setIsPreviewing(true);
    expect(usePopupStore.getState().isPreviewing).toBe(true);
  });

  it('setIsPreviewing(false) sets isPreviewing back to false', () => {
    usePopupStore.getState().setIsPreviewing(true);
    usePopupStore.getState().setIsPreviewing(false);
    expect(usePopupStore.getState().isPreviewing).toBe(false);
  });
});
