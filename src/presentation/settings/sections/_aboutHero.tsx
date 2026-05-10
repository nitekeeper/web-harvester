// src/presentation/settings/sections/_aboutHero.tsx
//
// Hero card sub-components used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { WHLogo } from '@presentation/components/WHLogo';

import { BORDER_1, C, MONO } from './_aboutShared';

/** Channel release pill badge (e.g. "stable"). */
function ChannelPill({ channel }: { readonly channel: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        color: C.subtle,
        background: C.border,
        padding: '1px 5px',
        borderRadius: 999,
      }}
    >
      {channel}
    </span>
  );
}

/** Hero name + version row inside the hero card. */
export function HeroNameRow({
  name,
  versionLabel,
  channel,
}: {
  readonly name: string;
  /** Fully-formatted version label, e.g. "v0.1.0". */
  readonly versionLabel: string;
  readonly channel: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: C.text }}>
        {name}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: C.subtle,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {versionLabel}
      </span>
      <ChannelPill channel={channel} />
    </div>
  );
}

/** Hero card — logo, product name, version string, channel pill, tagline. */
export function HeroCard({
  name,
  versionLabel,
  channel,
  tagline,
}: {
  readonly name: string;
  /** Fully-formatted version label, e.g. "v0.1.0". */
  readonly versionLabel: string;
  readonly channel: string;
  readonly tagline: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: C.panel,
        border: BORDER_1,
        borderRadius: 8,
        padding: '20px 22px',
        marginBottom: 22,
      }}
    >
      <WHLogo size={44} className="text-primary shrink-0" />
      <div>
        <HeroNameRow name={name} versionLabel={versionLabel} channel={channel} />
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted, margin: '4px 0 0' }}>
          {tagline}
        </p>
      </div>
    </div>
  );
}
