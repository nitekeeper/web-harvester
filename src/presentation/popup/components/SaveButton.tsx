// src/presentation/popup/components/SaveButton.tsx

import { Button } from '@presentation/components/ui/button';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Props for {@link SaveButton}. */
export interface SaveButtonProps {
  /** Whether a save operation is in flight; toggles the in-progress label. */
  readonly isSaving: boolean;
  /** Whether the button should be disabled (e.g. no destination chosen). */
  readonly isDisabled: boolean;
  /** Click handler invoked when the user triggers a save. */
  readonly onSave: () => void;
}

/**
 * Primary action button for the popup. Disabled when `isDisabled` is set or
 * a save is already in flight; the label switches to the "saving" string
 * during the in-flight window.
 */
export function SaveButton({ isSaving, isDisabled, onSave }: SaveButtonProps) {
  const fmt = useFormatMessage();

  return (
    <Button
      data-testid="save-button"
      className="w-full"
      disabled={isDisabled || isSaving}
      onClick={onSave}
    >
      {isSaving
        ? fmt({ id: 'popup.clip.saving', defaultMessage: 'Saving…' })
        : fmt({ id: 'popup.clip', defaultMessage: 'Clip Page' })}
    </Button>
  );
}
