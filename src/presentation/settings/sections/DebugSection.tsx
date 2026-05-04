// src/presentation/settings/sections/DebugSection.tsx

import { Alert, AlertDescription, AlertTitle } from '@presentation/components/ui/alert';
import { Badge } from '@presentation/components/ui/badge';
import { Separator } from '@presentation/components/ui/separator';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** State a plugin can be in for debug display. */
export type PluginState = 'active' | 'failed' | 'inactive';

/** Lightweight plugin status descriptor surfaced in the debug section. */
export interface PluginStatus {
  /** Stable plugin id. */
  readonly id: string;
  /** Human-friendly display name. */
  readonly name: string;
  /** Current lifecycle state of the plugin. */
  readonly state: PluginState;
  /** Optional error message — populated when `state === 'failed'`. */
  readonly error?: string;
}

/** Props for {@link DebugSection}. */
export interface DebugSectionProps {
  /** Plugin status records to display. Defaults to an empty list. */
  readonly plugins?: readonly PluginStatus[];
}

const BADGE_VARIANT: Record<PluginState, 'default' | 'destructive' | 'secondary'> = {
  active: 'default',
  failed: 'destructive',
  inactive: 'secondary',
};

/** Props for {@link PluginRow}. */
interface PluginRowProps {
  /** Plugin status record to render. */
  readonly plugin: PluginStatus;
}

/**
 * Renders one plugin status row plus the destructive alert for failed
 * plugins. Pulled out so {@link DebugSection} stays focused on layout.
 */
function PluginRow({ plugin }: PluginRowProps) {
  const fmt = useFormatMessage();
  const variant = BADGE_VARIANT[plugin.state];
  const stateLabel = fmt({
    id: `settings.debug.state.${plugin.state}`,
    defaultMessage: plugin.state,
  });
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{plugin.name}</span>
        <Badge variant={variant}>{stateLabel}</Badge>
      </div>
      {plugin.state === 'failed' ? (
        <Alert variant="destructive">
          <AlertTitle>
            {fmt({ id: 'settings.debug.failed', defaultMessage: 'Plugin failed to activate' })}
          </AlertTitle>
          <AlertDescription>{plugin.error ?? ''}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}

/**
 * Settings page section that lists plugins with badges for their lifecycle
 * state. Failed plugins also surface a destructive {@link Alert} so the user
 * sees the captured error message inline.
 */
export function DebugSection({ plugins = [] }: DebugSectionProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-3" data-testid="debug-section">
      <h2 className="text-base font-medium">
        {fmt({ id: 'settings.debug.heading', defaultMessage: 'Debug' })}
      </h2>
      <Separator />
      {plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {fmt({ id: 'settings.debug.empty', defaultMessage: 'No plugins registered.' })}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {plugins.map((plugin) => (
            <PluginRow key={plugin.id} plugin={plugin} />
          ))}
        </ul>
      )}
    </div>
  );
}
