import { PluginIcon } from '@presentation/components/icons';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { PluginRow, PluginState } from '@shared/pluginStatus';

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
        color: 'var(--wh-subtle)',
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
        color: 'var(--wh-muted)',
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
          color: 'var(--wh-text)',
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

/**
 * Settings page section listing every registered plugin with its lifecycle state.
 * Read-only diagnostic view — see ADR-027 for the storage bridge that populates it.
 */
export function PluginsSection({ plugins }: PluginsSectionProps) {
  const fmt = useFormatMessage();
  const sorted = sortPluginRows(plugins);
  return (
    <div style={{ padding: '22px 26px' }} data-testid="plugins-section">
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--wh-text)',
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
          color: 'var(--wh-muted)',
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
      {sorted.length === 0 ? <EmptyState /> : null}
    </div>
  );
}
