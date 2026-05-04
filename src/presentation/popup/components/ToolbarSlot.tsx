// src/presentation/popup/components/ToolbarSlot.tsx

import { usePluginSlot } from '@presentation/hooks/usePluginSlot';

/**
 * Renders every component plugins have registered into the `popup-toolbar`
 * slot. Always emits the wrapper element so the layout stays stable when no
 * plugins have contributed UI.
 */
export function ToolbarSlot() {
  const items = usePluginSlot('popup-toolbar');

  return (
    <div data-testid="toolbar-slot" className="flex items-center gap-2 min-h-6">
      {items.map((Item, i) => (
        <Item key={Item.displayName ?? Item.name ?? `slot-item-${String(i)}`} />
      ))}
    </div>
  );
}
