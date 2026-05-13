import { PluginIcon } from '@presentation/components/icons';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { PluginRow, PluginState } from '@shared/pluginStatus';

const COLOR_MUTED = 'var(--wh-muted)'; // CSS token: dim text
const COLOR_SUBTLE = 'var(--wh-subtle)'; // CSS token: subtle/placeholder text
const COLOR_TEXT = 'var(--wh-text)'; // CSS token: primary text
/** Decorative bullet used in the summary bar state indicators. */
const BULLET = '●'; // ●
/** Decorative middle-dot separator used in the summary bar. */
const MIDDOT = '·'; // ·
/** Non-breaking space used as a JSX text separator. */
const NBSP = ' '; // non-breaking space

/** Props for {@link PluginsSection}. */
export interface PluginsSectionProps {
  /** All registered plugins. Empty array renders the empty state. */
  readonly plugins: readonly PluginRow[];
}

/** Returns the display order weight for a plugin state (lower = shown first). */
function stateOrder(state: PluginState | string): number {
  if (state === 'failed') return 0;
  if (state === 'active') return 1;
  return 2;
}

/** Sorts plugin rows: failed → active → inactive; alphabetical within each group. */
function sortPluginRows(rows: readonly PluginRow[]): PluginRow[] {
  return [...rows].sort((a, b) => {
    const diff = stateOrder(a.state) - stateOrder(b.state);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/** Icon tile shown inside the empty state card. */
function EmptyStateIcon() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: 'var(--wh-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        color: COLOR_SUBTLE,
      }}
    >
      <PluginIcon size={22} strokeWidth={1.8} />
    </div>
  );
}

/** Sub-copy paragraph for the empty state card. */
function EmptyStateCopy() {
  const fmt = useFormatMessage();
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 400,
        color: COLOR_MUTED,
        lineHeight: 1.5,
        maxWidth: 360,
        margin: '4px auto 0',
      }}
    >
      {fmt({
        id: 'settings.plugins.empty.sub',
        defaultMessage:
          'Plugins listed in the manifest will appear here with their current load state.',
      })}
    </p>
  );
}

/** Empty state card shown when no plugins are registered. */
function EmptyState() {
  const fmt = useFormatMessage();
  return (
    <div
      style={{
        background: 'var(--wh-panel)',
        border: '1px dashed var(--wh-border)',
        borderRadius: '6px',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <EmptyStateIcon />
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: COLOR_TEXT,
          margin: '8px 0 0',
          lineHeight: 1.3,
        }}
      >
        {fmt({ id: 'settings.plugins.empty.headline', defaultMessage: 'No plugins registered' })}
      </p>
      <EmptyStateCopy />
    </div>
  );
}

/** Returns inline style tokens for a state pill. */
function pillStyle(state: PluginState | string): {
  color: string;
  background: string;
  dot: string;
} {
  switch (state) {
    case 'active':
      return { color: '#10b981', background: 'rgba(16,185,129,0.10)', dot: '#10b981' };
    case 'failed':
      return { color: '#ef4444', background: 'rgba(239,68,68,0.10)', dot: '#ef4444' };
    default:
      return { color: COLOR_MUTED, background: 'rgba(120,120,120,0.10)', dot: COLOR_SUBTLE };
  }
}

/** State pill — right-aligned badge with dot and label. */
function StatePill({
  state,
  label,
}: {
  readonly state: PluginState | string;
  readonly label: string;
}) {
  const { color, background, dot } = pillStyle(state);
  return (
    <span
      data-testid="state-pill"
      aria-label={state}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 999,
        background,
        fontSize: 11,
        fontWeight: 600,
        color,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, background: dot, display: 'inline-block' }}
      />
      {label}
    </span>
  );
}

/** Error block shown below a failed plugin row. */
function PluginErrorBlock({ error }: { readonly error: string }) {
  return (
    <div
      role="alert"
      style={{
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.20)',
        borderRadius: 4,
        padding: '6px 9px',
        fontSize: 11,
        fontFamily: 'var(--wh-mono)',
        color: '#b91c1c',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.5,
      }}
    >
      {error}
    </div>
  );
}

/** Formats a semver string with a leading `v` prefix for display, e.g. `v1.2.3`. */
function formatVersion(version: string): string {
  return `v${version}`;
}

/** Plugin meta row — name, version, and id badge. */
function PluginMeta({ plugin }: { readonly plugin: PluginRow }) {
  const versionLabel = plugin.version !== undefined ? formatVersion(plugin.version) : undefined;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          data-testid="plugin-name"
          style={{ fontSize: 13, fontWeight: 600, color: COLOR_TEXT }}
        >
          {plugin.name}
        </span>
        {versionLabel !== undefined ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: COLOR_SUBTLE,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {versionLabel}
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 400,
          color: COLOR_MUTED,
          fontFamily: 'var(--wh-mono)',
          marginTop: 2,
        }}
      >
        {plugin.id}
      </div>
    </div>
  );
}

/** Props for {@link PluginRowItem}. */
interface PluginRowItemProps {
  readonly plugin: PluginRow;
  readonly stateLabel: string;
  readonly isLast: boolean;
}

/** Renders a single plugin row inside the list card. */
function PluginRowItem({ plugin, stateLabel, isLast }: PluginRowItemProps) {
  return (
    <li
      style={{
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--wh-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PluginMeta plugin={plugin} />
        <StatePill state={plugin.state} label={stateLabel} />
      </div>
      {plugin.state === 'failed' && plugin.error !== undefined ? (
        <PluginErrorBlock error={plugin.error} />
      ) : null}
    </li>
  );
}

/** A single count item in the summary bar (dot + count + label). */
function SummaryCount({
  dotColor,
  count,
  label,
}: {
  readonly dotColor: string;
  readonly count: number;
  readonly label: string;
}) {
  return (
    <span>
      <span aria-hidden="true" style={{ color: dotColor }}>
        {BULLET}
      </span>
      {NBSP}
      {count}
      {NBSP}
      {label}
    </span>
  );
}

/** Counts plugins by state. */
function countByState(plugins: readonly PluginRow[]): {
  active: number;
  failed: number;
  inactive: number;
} {
  return {
    active: plugins.filter((p) => p.state === 'active').length,
    failed: plugins.filter((p) => p.state === 'failed').length,
    inactive: plugins.filter((p) => p.state === 'inactive').length,
  };
}

/** Summary bar showing total + per-state counts. Only renders when plugins.length > 0. */
function SummaryBar({ plugins }: { readonly plugins: readonly PluginRow[] }) {
  const fmt = useFormatMessage();
  const { active, failed, inactive } = countByState(plugins);
  return (
    <div
      data-testid="plugins-summary"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'baseline',
        fontSize: 11,
        fontWeight: 400,
        color: COLOR_MUTED,
        margin: '0 0 10px',
      }}
    >
      <span>
        <b style={{ color: COLOR_TEXT, fontVariantNumeric: 'tabular-nums' }}>{plugins.length}</b>
        {NBSP}
        {fmt({ id: 'settings.plugins.summary.registered', defaultMessage: 'registered' })}
      </span>
      <span aria-hidden="true">{MIDDOT}</span>
      <SummaryCount
        dotColor="#10b981"
        count={active}
        label={fmt({ id: 'settings.plugins.summary.active', defaultMessage: 'active' })}
      />
      <SummaryCount
        dotColor="#ef4444"
        count={failed}
        label={fmt({ id: 'settings.plugins.summary.failed', defaultMessage: 'failed' })}
      />
      <SummaryCount
        dotColor={COLOR_SUBTLE}
        count={inactive}
        label={fmt({ id: 'settings.plugins.summary.inactive', defaultMessage: 'inactive' })}
      />
    </div>
  );
}

/** Resolves the i18n state label for a plugin state value. */
function resolveStateLabel(
  state: string,
  fmt: (msg: { id: string; defaultMessage: string }) => string,
): string {
  return fmt({
    id: `settings.plugins.summary.${state}`,
    defaultMessage: state.charAt(0).toUpperCase() + state.slice(1),
  });
}

/** Plugin list card rendered when at least one plugin is registered. */
function PluginList({
  plugins,
  fmt,
}: {
  readonly plugins: readonly PluginRow[];
  readonly fmt: (msg: { id: string; defaultMessage: string }) => string;
}) {
  return (
    <div
      style={{
        background: 'var(--wh-panel)',
        border: '1px solid var(--wh-border)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {plugins.map((plugin, i) => (
          <PluginRowItem
            key={plugin.id}
            plugin={plugin}
            stateLabel={resolveStateLabel(plugin.state, fmt)}
            isLast={i === plugins.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

/** Section heading and description block. */
function SectionHeader() {
  const fmt = useFormatMessage();
  return (
    <>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: COLOR_TEXT,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {fmt({ id: 'settings.plugins.heading', defaultMessage: 'Plugins' })}
      </h2>
      <p
        style={{
          fontSize: 12.5,
          fontWeight: 400,
          color: COLOR_MUTED,
          margin: '4px 0 18px',
          lineHeight: 1.45,
        }}
      >
        {fmt({
          id: 'settings.plugins.description',
          defaultMessage:
            'Diagnostic view of registered plugins. Read-only — manage activation in plugin manifests.',
        })}
      </p>
    </>
  );
}

/**
 * Settings page section listing every registered plugin with its lifecycle state.
 * Read-only diagnostic view — see ADR-027 for the storage bridge that populates it.
 */
export function PluginsSection({ plugins }: PluginsSectionProps) {
  const fmt = useFormatMessage();
  const sorted = sortPluginRows(plugins);
  return (
    <div style={{ padding: '22px 26px' }} data-testid="plugins-section">
      <SectionHeader />
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryBar plugins={sorted} />
          <PluginList plugins={sorted} fmt={fmt} />
        </>
      )}
    </div>
  );
}
