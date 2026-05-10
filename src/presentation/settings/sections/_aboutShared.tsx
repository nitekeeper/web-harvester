// src/presentation/settings/sections/_aboutShared.tsx
//
// Shared constants and primitives used across About sub-components.
// Not exported from the public settings barrel — treat as private.

/** Design-token shorthand map used across About sub-components. */
export const C = {
  text: 'var(--wh-text)',
  muted: 'var(--wh-muted)',
  subtle: 'var(--wh-subtle)',
  border: 'var(--wh-border)',
  panel: 'var(--wh-panel)',
  hover: 'var(--wh-hover)',
  accent: 'var(--wh-accent)',
} as const;

/** Reusable 1px solid border shorthand. */
export const BORDER_1 = `1px solid ${C.border}`;

/** Monospace font family token. */
export const MONO = 'var(--wh-mono)';

/** Duration in ms for the copy-success flash state. */
export const COPY_FLASH_MS = 1800;

/** Lookup table mapping diagnostic field keys to their display labels. */
export const DIAG_LABELS: Record<string, string> = {
  version: 'version',
  build: 'build',
  channel: 'channel',
  browser: 'browser',
  platform: 'platform',
};

/** Section label rendered as uppercase caps above each content block. */
export function Eyebrow({ label }: { readonly label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        color: C.muted,
        marginBottom: 10,
      }}
    >
      {label}
    </div>
  );
}
