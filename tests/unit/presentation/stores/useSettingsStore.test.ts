// tests/unit/presentation/stores/useSettingsStore.test.ts

import { beforeEach, describe, expect, it } from 'vitest';

import { createSettingsStore } from '@presentation/stores/useSettingsStore';
import { DEFAULT_TEMPLATE } from '@shared/defaultTemplate';
import type { AppSettings, TemplateConfig } from '@shared/types';

import { MockAdapter } from '../../../helpers/MockAdapter';

const defaultSettings: AppSettings = {
  version: 1,
  theme: 'system',
  locale: 'en',
  defaultDestinationId: null,
  defaultTemplateId: null,
};

const sampleTemplate: TemplateConfig = {
  id: 't1',
  name: 'Default',
  frontmatterTemplate: '',
  bodyTemplate: '# {{title}}',
  noteNameTemplate: '{{title}}',
};

let adapter: MockAdapter;

describe('useSettingsStore — initial + settings', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('has correct initial state', () => {
    const store = createSettingsStore(adapter);
    const state = store.getState();
    expect(state.settings).toBeDefined();
    expect(state.destinations).toEqual([]);
    expect(state.templates).toEqual([DEFAULT_TEMPLATE]);
    expect(state.isLoading).toBe(false);
  });

  it('updateSettings merges partial settings', () => {
    const store = createSettingsStore(adapter);
    store.getState().setSettings({ ...defaultSettings });
    store.getState().updateSettings({ theme: 'dark' });
    expect(store.getState().settings.theme).toBe('dark');
  });
});

describe('useSettingsStore — collections + flags', () => {
  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('setDestinations replaces the destinations list', () => {
    const store = createSettingsStore(adapter);
    const dest = {
      id: 'd1',
      label: 'Notes',
      dirHandle: {} as FileSystemDirectoryHandle,
      fileNamePattern: '{date} {title}.md',
      createdAt: Date.now(),
    };
    store.getState().setDestinations([dest]);
    expect(store.getState().destinations).toHaveLength(1);
  });

  it('setTemplates replaces the templates list', () => {
    const store = createSettingsStore(adapter);
    store.getState().setTemplates([sampleTemplate]);
    expect(store.getState().templates).toHaveLength(1);
  });

  it('setLoading toggles the loading flag', () => {
    const store = createSettingsStore(adapter);
    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);
  });
});
