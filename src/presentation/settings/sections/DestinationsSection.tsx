// src/presentation/settings/sections/DestinationsSection.tsx

import { Folder, Plus, Star } from 'lucide-react';
import type { CSSProperties } from 'react';

import { EditableLabel } from '@presentation/components/EditableLabel';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { DestinationView } from '@presentation/stores/useSettingsStore';
import { createLogger } from '@shared/logger';

/** Props for {@link DestinationsSection}. */
export interface DestinationsSectionProps {
  /** Persisted destinations to render. Defaults to an empty list. */
  readonly destinations?: readonly DestinationView[];
  /** Id of the primary destination, or `null`/`undefined` if none is set. */
  readonly primaryId?: string | null;
  /** Handler that adds a new destination via the FSA picker. */
  readonly onAdd?: () => Promise<void>;
  /** Handler that removes the destination identified by `id`. */
  readonly onRemove?: (id: string) => Promise<void>;
  /** Handler that sets the destination identified by `id` as primary. */
  readonly onSetPrimary?: (id: string) => Promise<void>;
  /** Handler that renames the destination identified by `id` to `label`, refreshes the store. */
  readonly onRename?: (id: string, label: string) => Promise<void>;
}

const logger = createLogger('destinations-section');
const NOOP_ADD: () => Promise<void> = async () => undefined;
const NOOP_REMOVE: (id: string) => Promise<void> = async () => undefined;
const NOOP_SET_PRIMARY: (id: string) => Promise<void> = async () => undefined;
const NOOP_RENAME: (id: string, label: string) => Promise<void> = async () => undefined;

const COLOR_ACCENT = 'var(--wh-accent)';
const COLOR_MUTED = 'var(--wh-muted)';

const PANEL_STYLE: CSSProperties = {
  background: 'var(--wh-panel)',
  border: '1px solid var(--wh-border)',
  borderRadius: 6,
  overflow: 'hidden',
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Formatting function type for i18n message calls. */
type FmtFn = (msg: {
  id: string;
  defaultMessage: string;
  values?: Record<string, string | number>;
}) => string;

function formatLastUsedDate(lastUsed: number, now: number, fmt: FmtFn): string {
  const date = new Date(lastUsed);
  const nowDate = new Date(now);
  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return fmt({ id: 'destinations.lastUsed.yesterday', defaultMessage: 'last used yesterday' });
  }
  const monthName = MONTHS[date.getMonth()] as string;
  if (date.getFullYear() === nowDate.getFullYear()) {
    return fmt({
      id: 'destinations.lastUsed.sameYear',
      defaultMessage: `last used ${monthName} ${date.getDate()}`,
      values: { month: monthName, day: date.getDate() },
    });
  }
  return fmt({
    id: 'destinations.lastUsed.olderYear',
    defaultMessage: `last used ${monthName} ${date.getDate()}, ${date.getFullYear()}`,
    values: { month: monthName, day: date.getDate(), year: date.getFullYear() },
  });
}

function formatLastUsed(lastUsed: number, now: number, fmt: FmtFn): string {
  const diffSec = Math.floor((now - lastUsed) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60)
    return fmt({ id: 'destinations.lastUsed.justNow', defaultMessage: 'last used just now' });
  if (diffMin < 60)
    return fmt({
      id: 'destinations.lastUsed.minAgo',
      defaultMessage: `last used ${diffMin} min ago`,
      values: { n: diffMin },
    });
  if (diffHour < 24)
    return fmt({
      id: 'destinations.lastUsed.hourAgo',
      defaultMessage: `last used ${diffHour} hour${diffHour === 1 ? '' : 's'} ago`,
      values: { n: diffHour },
    });
  return formatLastUsedDate(lastUsed, now, fmt);
}

/** Props for {@link IconTile}. */
interface IconTileProps {
  readonly isPrimary: boolean;
}

function IconTile({ isPrimary }: IconTileProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[6px]"
      style={{ width: 32, height: 32, background: 'var(--wh-bg)' }}
    >
      <Folder size={14} style={{ color: isPrimary ? COLOR_ACCENT : COLOR_MUTED }} />
    </div>
  );
}

/** Props for {@link NameStack}. */
interface NameStackProps {
  readonly label: string;
  readonly isPrimary: boolean;
  readonly onRename: (label: string) => void;
}

function NameStack({ label, isPrimary, onRename }: NameStackProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex min-w-0 flex-1 items-center" style={{ gap: 6 }}>
      <EditableLabel
        value={label}
        onCommit={onRename}
        className="truncate"
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--wh-text)' }}
      />
      {isPrimary ? (
        <span
          style={{
            background: 'rgba(16,185,129,.15)',
            color: COLOR_ACCENT,
            fontSize: 9.5,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {fmt({ id: 'settings.destinations.primaryBadge', defaultMessage: 'Primary' })}
        </span>
      ) : null}
    </div>
  );
}

/** Props for {@link Timestamp}. */
interface TimestampProps {
  readonly lastUsed?: number;
}

function Timestamp({ lastUsed }: TimestampProps) {
  const fmt = useFormatMessage();
  if (lastUsed === undefined) return null;
  return (
    <span
      style={{ fontSize: 11, color: 'var(--wh-subtle)', marginRight: 10, whiteSpace: 'nowrap' }}
    >
      {formatLastUsed(lastUsed, Date.now(), fmt)}
    </span>
  );
}

/** Props for {@link StarButton}. */
interface StarButtonProps {
  readonly destinationId: string;
  readonly isPrimary: boolean;
  readonly onSetPrimary: (id: string) => void;
}

function StarButton({ destinationId, isPrimary, onSetPrimary }: StarButtonProps) {
  const fmt = useFormatMessage();
  return (
    <button
      data-testid={`set-primary-${destinationId}`}
      title={fmt({ id: 'settings.destinations.setPrimaryTitle', defaultMessage: 'Set primary' })}
      onClick={() => onSetPrimary(destinationId)}
      style={{
        background: 'transparent',
        border: 0,
        padding: 4,
        borderRadius: 4,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: isPrimary ? COLOR_ACCENT : COLOR_MUTED,
      }}
    >
      <Star size={14} fill={isPrimary ? COLOR_ACCENT : 'none'} stroke="currentColor" />
    </button>
  );
}

/** Props for {@link RemoveButton}. */
interface RemoveButtonProps {
  readonly destinationId: string;
  readonly onRemove: (id: string) => void;
}

function RemoveButton({ destinationId, onRemove }: RemoveButtonProps) {
  const fmt = useFormatMessage();
  return (
    <button
      data-testid={`remove-destination-${destinationId}`}
      onClick={() => onRemove(destinationId)}
      style={{
        background: 'transparent',
        border: 0,
        padding: 4,
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 11.5,
        color: COLOR_MUTED,
      }}
    >
      {fmt({ id: 'settings.destinations.remove', defaultMessage: 'Remove' })}
    </button>
  );
}

/** Props for {@link DestinationRow}. */
interface DestinationRowProps {
  readonly destination: DestinationView;
  readonly isPrimary: boolean;
  readonly isLast: boolean;
  readonly onRemove: (id: string) => void;
  readonly onSetPrimary: (id: string) => void;
  readonly onRename: (id: string, label: string) => void;
}

function DestinationRow({
  destination,
  isPrimary,
  isLast,
  onRemove,
  onSetPrimary,
  onRename,
}: DestinationRowProps) {
  return (
    <li
      className="flex items-center transition-colors hover:bg-[var(--wh-hover)]"
      style={{
        gap: 12,
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--wh-border)',
      }}
    >
      <IconTile isPrimary={isPrimary} />
      <NameStack
        label={destination.label}
        isPrimary={isPrimary}
        onRename={(label) => onRename(destination.id, label)}
      />
      <Timestamp lastUsed={destination.lastUsed} />
      <StarButton
        destinationId={destination.id}
        isPrimary={isPrimary}
        onSetPrimary={onSetPrimary}
      />
      <RemoveButton destinationId={destination.id} onRemove={onRemove} />
    </li>
  );
}

/** Props for {@link SectionHeader}. */
interface SectionHeaderProps {
  readonly handleAdd: () => void;
}

function SectionHeader({ handleAdd }: SectionHeaderProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-baseline justify-between" style={{ marginBottom: 18 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
          {fmt({ id: 'settings.destinations.heading', defaultMessage: 'Destinations' })}
        </h2>
        <p style={{ fontSize: 12.5, color: COLOR_MUTED }}>
          {fmt({
            id: 'settings.destinations.subtitle',
            defaultMessage: 'Local folders where clipped pages will be saved.',
          })}
        </p>
      </div>
      <button
        data-testid="add-destination"
        onClick={handleAdd}
        className="flex items-center"
        style={{
          background: COLOR_ACCENT,
          color: 'var(--wh-accent-text)',
          border: 0,
          padding: '6px 12px',
          borderRadius: 5,
          fontSize: 12,
          fontWeight: 600,
          gap: 5,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Plus size={12} />
        {fmt({ id: 'settings.destinations.add', defaultMessage: 'Add destination' })}
      </button>
    </div>
  );
}

function EmptyNotice() {
  const fmt = useFormatMessage();
  return (
    <p style={{ fontSize: 14, color: COLOR_MUTED, padding: '12px 14px' }}>
      {fmt({
        id: 'settings.destinations.empty',
        defaultMessage: 'No destinations configured yet.',
      })}
    </p>
  );
}

/** Props for {@link DestinationList}. */
interface DestinationListProps {
  readonly destinations: readonly DestinationView[];
  readonly primaryId: string | null;
  readonly onRemove: (id: string) => void;
  readonly onSetPrimary: (id: string) => void;
  readonly onRename: (id: string, label: string) => void;
}

function DestinationList({
  destinations,
  primaryId,
  onRemove,
  onSetPrimary,
  onRename,
}: DestinationListProps) {
  if (destinations.length === 0) return <EmptyNotice />;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {destinations.map((dest, index) => (
        <DestinationRow
          key={dest.id}
          destination={dest}
          isPrimary={dest.id === primaryId}
          isLast={index === destinations.length - 1}
          onRemove={onRemove}
          onSetPrimary={onSetPrimary}
          onRename={onRename}
        />
      ))}
    </ul>
  );
}

/**
 * Settings page section that lists registered destination folders, allows
 * marking one as primary via the star button, removing entries, adding
 * new ones via the FSA picker, and renaming existing ones inline. All
 * handlers are optional so the SPA shell can render the section without
 * wiring before the composition root lands.
 */
export function DestinationsSection({
  destinations = [],
  primaryId = null,
  onAdd = NOOP_ADD,
  onRemove = NOOP_REMOVE,
  onSetPrimary = NOOP_SET_PRIMARY,
  onRename = NOOP_RENAME,
}: DestinationsSectionProps) {
  const handleAdd = (): void => {
    onAdd().catch((err: unknown) => logger.error('destination add failed', err));
  };
  const handleRemove = (id: string): void => {
    onRemove(id).catch((err: unknown) => logger.error('destination remove failed', err));
  };
  const handleSetPrimary = (id: string): void => {
    onSetPrimary(id).catch((err: unknown) => logger.error('set-primary failed', err));
  };
  const handleRename = (id: string, label: string): void => {
    onRename(id, label).catch((err: unknown) => logger.error('destination rename failed', err));
  };

  return (
    <div data-testid="destinations-section" style={{ padding: '22px 26px' }}>
      <SectionHeader handleAdd={handleAdd} />
      <div style={PANEL_STYLE}>
        <DestinationList
          destinations={destinations}
          primaryId={primaryId}
          onRemove={handleRemove}
          onSetPrimary={handleSetPrimary}
          onRename={handleRename}
        />
      </div>
    </div>
  );
}
