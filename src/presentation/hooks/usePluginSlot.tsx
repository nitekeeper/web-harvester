// src/presentation/hooks/usePluginSlot.tsx

import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

/**
 * Named slot identifiers exposed to plugins. Each slot corresponds to a
 * dedicated mount point in the React tree (toolbar, navigation, etc.).
 */
export type SlotName = 'popup-toolbar' | 'settings-nav' | 'side-panel-toolbar';

/**
 * Read/write facade over the per-slot component registry. Plugins call
 * {@link PluginSlotRegistry.register} during boot; consumer components call
 * {@link PluginSlotRegistry.getItems} to render the registered components.
 */
export interface PluginSlotRegistry {
  /** Adds `component` to the list of items rendered into `slot`. */
  register: (slot: SlotName, component: ComponentType) => void;
  /** Returns the components currently registered for `slot`. */
  getItems: (slot: SlotName) => ComponentType[];
}

const PluginSlotContext = createContext<PluginSlotRegistry>({
  register: () => undefined,
  getItems: () => [],
});

/**
 * Reads the components registered for `slot` from the surrounding
 * {@link PluginSlotProvider}. Returns an empty array when no provider is
 * mounted or no plugins have registered into the slot.
 */
export function usePluginSlot(slot: SlotName): ComponentType[] {
  return useContext(PluginSlotContext).getItems(slot);
}

/** Props for the {@link PluginSlotProvider} React context provider. */
export interface PluginSlotProviderProps {
  /** Registry instance that backs the provider. */
  readonly registry: PluginSlotRegistry;
  /** Subtree that may consume the registry via {@link usePluginSlot}. */
  readonly children: ReactNode;
}

/**
 * React context provider that exposes a {@link PluginSlotRegistry} to the
 * subtree. Mount a single provider near the root of each entry point (popup,
 * options, side panel) so plugins can inject UI into named slots.
 */
export function PluginSlotProvider({ registry, children }: PluginSlotProviderProps) {
  return <PluginSlotContext.Provider value={registry}>{children}</PluginSlotContext.Provider>;
}

/**
 * Builds an in-memory {@link PluginSlotRegistry}. Each registry instance owns
 * its own per-slot storage — call once per host React tree and pass the
 * result into a {@link PluginSlotProvider}.
 */
export function createPluginSlotRegistry(): PluginSlotRegistry {
  const slots = new Map<SlotName, ComponentType[]>();
  return {
    register(slot, component) {
      const existing = slots.get(slot) ?? [];
      slots.set(slot, [...existing, component]);
    },
    getItems(slot) {
      return slots.get(slot) ?? [];
    },
  };
}
