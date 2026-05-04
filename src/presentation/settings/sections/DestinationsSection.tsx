// src/presentation/settings/sections/DestinationsSection.tsx

import { useState } from 'react';

import { Badge } from '@presentation/components/ui/badge';
import { Button } from '@presentation/components/ui/button';
import { Input } from '@presentation/components/ui/input';
import { Separator } from '@presentation/components/ui/separator';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { DestinationView } from '@presentation/stores/useSettingsStore';
import { createLogger } from '@shared/logger';

/** Props for {@link DestinationsSection}. */
export interface DestinationsSectionProps {
  /** Persisted destinations to render. Defaults to an empty list. */
  readonly destinations?: readonly DestinationView[];
  /** Handler that adds a new destination via the FSA picker. */
  readonly onAdd?: () => Promise<void>;
  /** Handler that removes the destination identified by `id`. */
  readonly onRemove?: (id: string) => Promise<void>;
  /** Handler that renames the destination identified by `id` to `label`. */
  readonly onRename?: (id: string, label: string) => Promise<void>;
}

const logger = createLogger('destinations-section');
const NOOP_ADD: () => Promise<void> = async () => undefined;
const NOOP_REMOVE: (id: string) => Promise<void> = async () => undefined;
const NOOP_RENAME: (id: string, label: string) => Promise<void> = async () => undefined;

/** Slice returned by {@link useRenameController}. */
interface RenameController {
  /** Id of the row currently being renamed, or `null` when none is. */
  readonly editingId: string | null;
  /** Current draft label entered into the inline rename input. */
  readonly draftLabel: string;
  /** Updates the rename draft label as the user types. */
  readonly setDraftLabel: (value: string) => void;
  /** Switches the supplied row into edit mode and seeds the draft label. */
  readonly startEdit: (dest: DestinationView) => void;
  /** Discards the draft and exits edit mode. */
  readonly cancelEdit: () => void;
  /** Commits the draft via `onRename` and exits edit mode. */
  readonly commitRename: (id: string) => void;
}

/**
 * Encapsulates the rename draft state plus its commit/cancel actions. The
 * draft is cleared in `commitRename` *before* the rename promise is awaited
 * so the row exits edit mode even if the host's rename rejects.
 */
function useRenameController(
  onRename: (id: string, label: string) => Promise<void>,
): RenameController {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  return {
    editingId,
    draftLabel,
    setDraftLabel,
    startEdit: (dest) => {
      setEditingId(dest.id);
      setDraftLabel(dest.label);
    },
    cancelEdit: () => {
      setEditingId(null);
      setDraftLabel('');
    },
    commitRename: (id) => {
      const label = draftLabel;
      setEditingId(null);
      setDraftLabel('');
      onRename(id, label).catch((err: unknown) => logger.error('rename failed', err));
    },
  };
}

/** Props for {@link RowEditing}. */
interface RowEditingProps {
  /** Destination being edited. */
  readonly destination: DestinationView;
  /** Current draft label rendered inside the inline input. */
  readonly draftLabel: string;
  /** Setter wired to the input's `onChange`. */
  readonly setDraftLabel: (value: string) => void;
  /** Called when the user presses Enter to commit the rename. */
  readonly commitRename: (id: string) => void;
  /** Called when the user presses Escape to cancel the rename. */
  readonly cancelEdit: () => void;
}

/** Renders the inline rename input shown while a row is being edited. */
function RowEditing({
  destination,
  draftLabel,
  setDraftLabel,
  commitRename,
  cancelEdit,
}: RowEditingProps) {
  return (
    <Input
      data-testid={`rename-input-${destination.id}`}
      value={draftLabel}
      onChange={(e) => setDraftLabel(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitRename(destination.id);
        if (e.key === 'Escape') cancelEdit();
      }}
      autoFocus
    />
  );
}

/** Renders the read-only label + dirHandle badge for a destination row. */
function RowDisplay({ destination }: { readonly destination: DestinationView }) {
  const dirName = destination.dirHandle?.name ?? '';
  return (
    <>
      <span className="text-sm font-medium">{destination.label}</span>
      {dirName ? <Badge variant="outline">{dirName}</Badge> : null}
    </>
  );
}

/** Props for {@link RowActions}. */
interface RowActionsProps {
  /** Destination this action cluster belongs to. */
  readonly destination: DestinationView;
  /** Switches the supplied row into edit mode. */
  readonly startEdit: (dest: DestinationView) => void;
  /** Triggers the destination removal flow. */
  readonly removeDestination: (id: string) => void;
}

/** Rename + remove button cluster shown on the right side of a row. */
function RowActions({ destination, startEdit, removeDestination }: RowActionsProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-center gap-1">
      <Button
        data-testid={`rename-destination-${destination.id}`}
        variant="ghost"
        size="sm"
        onClick={() => startEdit(destination)}
      >
        {fmt({ id: 'settings.destinations.rename', defaultMessage: 'Rename' })}
      </Button>
      <Button
        data-testid={`remove-destination-${destination.id}`}
        variant="destructive"
        size="sm"
        onClick={() => removeDestination(destination.id)}
      >
        {fmt({ id: 'settings.destinations.remove', defaultMessage: 'Remove' })}
      </Button>
    </div>
  );
}

/** Props for {@link DestinationRow}. */
interface RowProps {
  /** Destination to render. */
  readonly destination: DestinationView;
  /** Shared rename controller produced by {@link useRenameController}. */
  readonly controller: RenameController;
  /** Triggers destination removal. */
  readonly removeDestination: (id: string) => void;
}

/** One destination row — toggles between display and editing subcomponents. */
function DestinationRow({ destination, controller, removeDestination }: RowProps) {
  const isEditing = controller.editingId === destination.id;
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="flex flex-1 items-center gap-2">
        {isEditing ? (
          <RowEditing
            destination={destination}
            draftLabel={controller.draftLabel}
            setDraftLabel={controller.setDraftLabel}
            commitRename={controller.commitRename}
            cancelEdit={controller.cancelEdit}
          />
        ) : (
          <RowDisplay destination={destination} />
        )}
      </div>
      <RowActions
        destination={destination}
        startEdit={controller.startEdit}
        removeDestination={removeDestination}
      />
    </li>
  );
}

/** Props for {@link SectionHeader}. */
interface HeaderProps {
  /** Click handler invoked when the user clicks "Add destination". */
  readonly handleAdd: () => void;
}

/** Heading + add button rendered at the top of the section. */
function SectionHeader({ handleAdd }: HeaderProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-medium">
        {fmt({ id: 'settings.destinations.heading', defaultMessage: 'Destinations' })}
      </h2>
      <Button size="sm" onClick={handleAdd} data-testid="add-destination">
        {fmt({ id: 'settings.destinations.add', defaultMessage: 'Add destination' })}
      </Button>
    </div>
  );
}

/** Empty-state notice shown when there are no destinations. */
function EmptyNotice() {
  const fmt = useFormatMessage();
  return (
    <p className="text-sm text-muted-foreground">
      {fmt({
        id: 'settings.destinations.empty',
        defaultMessage: 'No destinations configured yet.',
      })}
    </p>
  );
}

/**
 * Settings page section that lists registered destination folders, lets the
 * user rename or remove each one, and exposes an "Add" button that delegates
 * to the host-supplied FSA picker. All handlers are optional so the SPA shell
 * can render the section without wiring before the composition root lands.
 */
export function DestinationsSection({
  destinations = [],
  onAdd = NOOP_ADD,
  onRemove = NOOP_REMOVE,
  onRename = NOOP_RENAME,
}: DestinationsSectionProps) {
  const controller = useRenameController(onRename);
  const handleAdd = (): void => {
    onAdd().catch((err: unknown) => logger.error('add failed', err));
  };
  const removeDestination = (id: string): void => {
    onRemove(id).catch((err: unknown) => logger.error('remove failed', err));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="destinations-section">
      <SectionHeader handleAdd={handleAdd} />
      <Separator />
      {destinations.length === 0 ? (
        <EmptyNotice />
      ) : (
        <ul className="divide-y divide-border">
          {destinations.map((dest) => (
            <DestinationRow
              key={dest.id}
              destination={dest}
              controller={controller}
              removeDestination={removeDestination}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
