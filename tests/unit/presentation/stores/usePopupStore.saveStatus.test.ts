// tests/unit/presentation/stores/usePopupStore.saveStatus.test.ts

import { beforeEach, describe, expect, it } from 'vitest';

import { createPopupStore } from '@presentation/stores/usePopupStore';

import { MockAdapter } from '../../../helpers/MockAdapter';

describe('usePopupStore — saveStatus', () => {
  let store: ReturnType<typeof createPopupStore>;

  beforeEach(() => {
    store = createPopupStore(new MockAdapter());
  });

  it('defaults to idle', () => {
    expect(store.getState().saveStatus).toBe('idle');
  });

  it('defaults saveDestinationLabel to null', () => {
    expect(store.getState().saveDestinationLabel).toBeNull();
  });

  it('setSaveStatus updates status and label together', () => {
    store.getState().setSaveStatus('success', 'Reading Notes');
    expect(store.getState().saveStatus).toBe('success');
    expect(store.getState().saveDestinationLabel).toBe('Reading Notes');
  });

  it('setSaveStatus without label sets label to null', () => {
    store.getState().setSaveStatus('saving');
    expect(store.getState().saveDestinationLabel).toBeNull();
  });
});
