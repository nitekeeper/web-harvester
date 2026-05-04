// src/presentation/popup/components/DestinationSelector.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@presentation/components/ui/select';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { DestinationView } from '@presentation/stores/useSettingsStore';

/** Props for {@link DestinationSelector}. */
export interface DestinationSelectorProps {
  /** Available destinations to render in the dropdown. */
  readonly destinations: readonly DestinationView[];
  /** Currently selected destination id, or `null` when none is chosen. */
  readonly selectedId: string | null;
  /** Called with the chosen destination id when the user picks one. */
  readonly onSelect: (id: string) => void;
}

/**
 * Renders the popup's destination picker. Falls back to a "no destinations"
 * notice when the list is empty so the user still sees the slot location.
 */
export function DestinationSelector({
  destinations,
  selectedId,
  onSelect,
}: DestinationSelectorProps) {
  const fmt = useFormatMessage();

  if (destinations.length === 0) {
    return (
      <p data-testid="destination-selector" className="text-sm text-muted-foreground">
        {fmt({ id: 'popup.noDestinations' })}
      </p>
    );
  }

  return (
    <Select value={selectedId ?? undefined} onValueChange={onSelect}>
      <SelectTrigger data-testid="destination-selector" className="w-full">
        <SelectValue placeholder={fmt({ id: 'popup.selectDestination' })} />
      </SelectTrigger>
      <SelectContent>
        {destinations.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
