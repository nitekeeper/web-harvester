// src/core/ui-registry.ts
//
// In-memory implementation of `IUIRegistry`. Plugins call this registry during
// `activate()` to contribute slot entries, named components, and theme tokens.
// The host UI (popup, settings page, side panel) reads from the registry at
// render time.
//
// This is the composition-root-side concrete; the structural contract lives in
// `@domain/types` so plugins can depend on it without crossing layers.

import type React from 'react';

import type { ISlotEntry, IUIRegistry, UIContext, UISlot } from '@domain/types';

/**
 * A slot entry paired with the UI contexts that should render it. Stored
 * internally so the host can filter by context (`popup` / `settings` /
 * `side-panel`) at render time.
 */
interface SlotEntryWithContexts {
  readonly entry: ISlotEntry;
  readonly contexts: readonly UIContext[];
}

const ALL_CONTEXTS: readonly UIContext[] = ['popup', 'settings', 'side-panel'];

/**
 * Creates a fresh in-memory `IUIRegistry`. Slot entries, components, and theme
 * tokens are stored in plain `Map`s; nothing is rendered here — the registry
 * is purely a directory for the host UI to consult.
 */
export function createUIRegistry(): IUIRegistry {
  const slots = new Map<UISlot, SlotEntryWithContexts[]>();
  const components = new Map<string, React.ComponentType>();
  const themeTokens: Record<string, string> = {};

  return {
    addToSlot(slot: UISlot, entry: ISlotEntry, contexts?: UIContext[]): void {
      const list = slots.get(slot) ?? [];
      list.push({ entry, contexts: contexts ?? ALL_CONTEXTS });
      slots.set(slot, list);
    },
    registerComponent(id: string, component: React.ComponentType): void {
      components.set(id, component);
    },
    getComponent(id: string): React.ComponentType | undefined {
      return components.get(id);
    },
    registerThemeTokens(tokens: Record<string, string>): void {
      Object.assign(themeTokens, tokens);
    },
  };
}
