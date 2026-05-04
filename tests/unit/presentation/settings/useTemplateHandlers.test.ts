// tests/unit/presentation/settings/useTemplateHandlers.test.ts
//
// Unit tests for `useTemplateHandlers` — pure-store handlers for the
// settings page's templates section. Templates live only in Zustand (not
// IDB), so the handlers are simple state mutations.

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTemplateHandlers } from '@presentation/settings/useTemplateHandlers';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import type { TemplateConfig } from '@shared/types';

const newTemplate: Omit<TemplateConfig, 'id'> = {
  name: 'Sample',
  frontmatterTemplate: '',
  bodyTemplate: '# {{title}}',
  noteNameTemplate: '{{title}}',
};

beforeEach(() => {
  useSettingsStore.setState({ templates: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTemplateHandlers — onAdd', () => {
  it('appends a new template with a generated id to the store', async () => {
    const { result } = renderHook(() => useTemplateHandlers());
    await act(async () => {
      await result.current.onAdd(newTemplate);
    });
    const stored = useSettingsStore.getState().templates;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe('Sample');
    expect(stored[0]?.id).toBeTruthy();
  });
});

describe('useTemplateHandlers — onRemove', () => {
  it('removes the template identified by id from the store', async () => {
    useSettingsStore.setState({
      templates: [
        { id: 'a', name: 'A', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
        { id: 'b', name: 'B', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
      ],
    });
    const { result } = renderHook(() => useTemplateHandlers());
    await act(async () => {
      await result.current.onRemove('a');
    });
    const stored = useSettingsStore.getState().templates;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe('b');
  });
});

describe('useTemplateHandlers — onUpdate', () => {
  it('merges changes into the matching template, leaving others alone', async () => {
    useSettingsStore.setState({
      templates: [
        { id: 'a', name: 'A', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
        { id: 'b', name: 'B', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
      ],
    });
    const { result } = renderHook(() => useTemplateHandlers());
    await act(async () => {
      await result.current.onUpdate('a', { name: 'A2' });
    });
    const stored = useSettingsStore.getState().templates;
    expect(stored.find((t) => t.id === 'a')?.name).toBe('A2');
    expect(stored.find((t) => t.id === 'b')?.name).toBe('B');
  });
});
