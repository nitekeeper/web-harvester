// src/presentation/popup/components/PickerToggle.tsx

import { Button } from '@presentation/components/ui/button';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Props for {@link PickerToggle}. */
export interface PickerToggleProps {
  /** Whether the visual picker overlay is currently active. */
  readonly isActive: boolean;
  /** Click handler that toggles the picker on or off. */
  readonly onToggle: () => void;
}

/**
 * Renders the start/stop toggle for the visual element picker. Switches to
 * the destructive variant while the picker is active to signal that the next
 * click stops the overlay.
 */
export function PickerToggle({ isActive, onToggle }: PickerToggleProps) {
  const fmt = useFormatMessage();

  return (
    <Button
      data-testid="picker-toggle"
      variant={isActive ? 'destructive' : 'outline'}
      size="sm"
      onClick={onToggle}
    >
      {isActive ? fmt({ id: 'popup.picker.stop' }) : fmt({ id: 'popup.picker.start' })}
    </Button>
  );
}
