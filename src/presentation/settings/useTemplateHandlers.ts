// src/presentation/settings/useTemplateHandlers.ts
//
// Hook that produces the three async handlers consumed by `TemplatesSection`.
// Templates live only in the Zustand settings store (no IDB), so each handler
// is a pure store mutation; persistence to chrome.storage is handled by
// `bootstrapStore` wired in the settings composition root.

import { useCallback } from 'react';

import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import type { TemplateConfig } from '@shared/types';

/**
 * Async handlers used by `TemplatesSection` — one each for the Add, Remove,
 * and Update flows. Templates are persisted to chrome.storage via
 * `bootstrapStore` watching the settings store, so handlers do not need to
 * call any storage facade directly.
 */
export interface TemplateHandlers {
  /** Appends a new template (id generated via `crypto.randomUUID`). */
  onAdd: (template: Omit<TemplateConfig, 'id'>) => Promise<void>;
  /** Removes the template identified by `id`. */
  onRemove: (id: string) => Promise<void>;
  /** Merges `changes` into the template identified by `id`. */
  onUpdate: (id: string, changes: Partial<TemplateConfig>) => Promise<void>;
}

/**
 * Returns memoised template handlers wired to the singleton settings store.
 * Each handler reads the latest `templates` snapshot via
 * `useSettingsStore.getState()` rather than a closed-over selector value, so
 * back-to-back mutations that fire before React re-renders both observe the
 * up-to-date list. `setTemplates` is a stable Zustand action reference, so
 * the callbacks remain referentially stable across renders.
 */
export function useTemplateHandlers(): TemplateHandlers {
  const setTemplates = useSettingsStore((s) => s.setTemplates);

  const onAdd = useCallback(
    async (template: Omit<TemplateConfig, 'id'>): Promise<void> => {
      const current = useSettingsStore.getState().templates;
      const newTemplate: TemplateConfig = { ...template, id: crypto.randomUUID() };
      setTemplates([...current, newTemplate]);
    },
    [setTemplates],
  );

  const onRemove = useCallback(
    async (id: string): Promise<void> => {
      const current = useSettingsStore.getState().templates;
      setTemplates(current.filter((t) => t.id !== id));
    },
    [setTemplates],
  );

  const onUpdate = useCallback(
    async (id: string, changes: Partial<TemplateConfig>): Promise<void> => {
      const current = useSettingsStore.getState().templates;
      setTemplates(current.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [setTemplates],
  );

  return { onAdd, onRemove, onUpdate };
}
