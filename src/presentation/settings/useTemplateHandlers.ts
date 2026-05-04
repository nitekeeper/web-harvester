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
 * Reads `templates` and `setTemplates` via the store hook so the handlers
 * always operate on the current snapshot.
 */
export function useTemplateHandlers(): TemplateHandlers {
  const templates = useSettingsStore((s) => s.templates);
  const setTemplates = useSettingsStore((s) => s.setTemplates);

  const onAdd = useCallback(
    async (template: Omit<TemplateConfig, 'id'>): Promise<void> => {
      const newTemplate: TemplateConfig = { ...template, id: crypto.randomUUID() };
      setTemplates([...templates, newTemplate]);
    },
    [templates, setTemplates],
  );

  const onRemove = useCallback(
    async (id: string): Promise<void> => {
      setTemplates(templates.filter((t) => t.id !== id));
    },
    [templates, setTemplates],
  );

  const onUpdate = useCallback(
    async (id: string, changes: Partial<TemplateConfig>): Promise<void> => {
      setTemplates(templates.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [templates, setTemplates],
  );

  return { onAdd, onRemove, onUpdate };
}
