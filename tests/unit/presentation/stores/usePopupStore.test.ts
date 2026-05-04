// tests/unit/presentation/stores/usePopupStore.test.ts

import { beforeEach, describe, expect, it } from 'vitest';

import { createPopupStore } from '@presentation/stores/usePopupStore';

import { MockAdapter } from '../../../helpers/MockAdapter';

let adapter: MockAdapter;

describe('usePopupStore — initial state', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('has correct initial state', () => {
    const store = createPopupStore(adapter);
    const state = store.getState();
    expect(state.activeTab).toBeNull();
    expect(state.selectedDestinationId).toBeNull();
    expect(state.selectedTemplateId).toBeNull();
    expect(state.isPickerActive).toBe(false);
    expect(state.pickerResult).toBeNull();
    expect(state.previewMarkdown).toBe('');
    expect(state.isSaving).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('usePopupStore — selection actions', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('setActiveTab updates the active tab', () => {
    const store = createPopupStore(adapter);
    store.getState().setActiveTab({ id: 1, url: 'https://example.com', title: 'Example' });
    expect(store.getState().activeTab?.url).toBe('https://example.com');
  });

  it('setSelectedDestinationId updates the destination', () => {
    const store = createPopupStore(adapter);
    store.getState().setSelectedDestinationId('dest-1');
    expect(store.getState().selectedDestinationId).toBe('dest-1');
  });
});

describe('usePopupStore — picker actions', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('setPickerActive toggles picker state', () => {
    const store = createPopupStore(adapter);
    store.getState().setPickerActive(true);
    expect(store.getState().isPickerActive).toBe(true);
    store.getState().setPickerActive(false);
    expect(store.getState().isPickerActive).toBe(false);
  });

  it('setPickerResult stores picker output', () => {
    const store = createPopupStore(adapter);
    store.getState().setPickerResult({ excludedXPaths: ['/html/body/div'] });
    expect(store.getState().pickerResult?.excludedXPaths).toHaveLength(1);
  });
});

describe('usePopupStore — preview / saving / error actions', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('setPreviewMarkdown updates markdown preview', () => {
    const store = createPopupStore(adapter);
    store.getState().setPreviewMarkdown('# Hello');
    expect(store.getState().previewMarkdown).toBe('# Hello');
  });

  it('setSaving toggles isSaving flag', () => {
    const store = createPopupStore(adapter);
    store.getState().setSaving(true);
    expect(store.getState().isSaving).toBe(true);
  });

  it('setError stores an error message', () => {
    const store = createPopupStore(adapter);
    store.getState().setError('Something went wrong');
    expect(store.getState().error).toBe('Something went wrong');
  });

  it('clearError resets error to null', () => {
    const store = createPopupStore(adapter);
    store.getState().setError('oops');
    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });
});
