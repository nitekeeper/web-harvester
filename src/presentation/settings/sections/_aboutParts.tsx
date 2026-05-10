// src/presentation/settings/sections/_aboutParts.tsx
//
// Internal sub-components used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { useState } from 'react';

import { CheckIcon, ClipboardIcon, ExternalArrowIcon } from '@presentation/components/icons';
import { WHLogo } from '@presentation/components/WHLogo';

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
const MONO = 'var(--wh-mono)';

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

/** Shape of a single resource row definition. */
export interface ResourceRowDef {
  /** Stable row identifier used as React key. */
  readonly id: string;
  /** Human-readable row label. */
  readonly label: string;
  /** Secondary descriptor shown below the label. */
  readonly meta: string;
  /** When true, meta is rendered in the monospace font. */
  readonly metaMono: boolean;
  /** Leading icon node. */
  readonly icon: React.ReactNode;
  /** URL opened in a new tab on click. */
  readonly url: string;
}

/** Inner content of a resource row (label + meta). */
function ResourceRowBody({ def }: { readonly def: ResourceRowDef }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: C.text }}>{def.label}</div>
      <div
        style={{
          fontSize: 11,
          color: C.subtle,
          marginTop: 1,
          fontFamily: def.metaMono ? MONO : undefined,
        }}
      >
        {def.meta}
      </div>
    </div>
  );
}

/** A single clickable row that opens an external URL in a new tab. */
export function ResourceRow({
  def,
  isLast,
}: {
  readonly def: ResourceRowDef;
  readonly isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const openUrl = () => {
    window.open(def.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={openUrl}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: isLast ? 'none' : BORDER_1,
        background: hovered ? C.hover : 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left' as const,
      }}
    >
      <span style={{ color: C.muted, lineHeight: 0, flexShrink: 0 }}>{def.icon}</span>
      <ResourceRowBody def={def} />
      <span aria-hidden="true" style={{ color: C.subtle, lineHeight: 0, flexShrink: 0 }}>
        <ExternalArrowIcon />
      </span>
    </button>
  );
}

/** Card container wrapping the external resource rows. */
export function ResourcesCard({
  rows,
  heading,
}: {
  readonly rows: readonly ResourceRowDef[];
  readonly heading: string;
}) {
  return (
    <>
      <Eyebrow label={heading} />
      <div
        style={{
          background: C.panel,
          border: BORDER_1,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 22,
        }}
      >
        {rows.map((row, i) => (
          <ResourceRow key={row.id} def={row} isLast={i === rows.length - 1} />
        ))}
      </div>
    </>
  );
}

/** Props for the Copy button in the diagnostics header. */
interface CopyButtonProps {
  /** Whether the copy action just succeeded. */
  readonly copied: boolean;
  /** Callback invoked when the button is clicked. */
  readonly onCopy: () => void;
  /** Label shown in the default state. */
  readonly copyLabel: string;
  /** Label shown in the success state. */
  readonly copiedLabel: string;
}

/** Copy button shown in the diagnostics header row. */
export function CopyButton({ copied, onCopy, copyLabel, copiedLabel }: CopyButtonProps) {
  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: BORDER_1,
        borderRadius: 5,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        color: copied ? C.accent : C.text,
        cursor: 'pointer',
      }}
    >
      <span aria-hidden="true" style={{ lineHeight: 0 }}>
        {copied ? <CheckIcon size={12} /> : <ClipboardIcon />}
      </span>
      <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
    </button>
  );
}

/** Diagnostics field table rows. */
export function DiagFieldRows({ fields }: { readonly fields: readonly [string, string][] }) {
  return (
    <>
      {fields.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: 12 }}>
          <span style={{ width: 78, flexShrink: 0, color: C.subtle }}>
            {Object.prototype.hasOwnProperty.call(DIAG_LABELS, key)
              ? // eslint-disable-next-line security/detect-object-injection
                DIAG_LABELS[key]
              : key}
          </span>
          <span style={{ flex: 1, color: C.text }}>{value}</span>
        </div>
      ))}
    </>
  );
}

/** Props for the diagnostics read-only table. */
export interface DiagnosticsBlockProps {
  /** Extension version string. */
  readonly version: string;
  /** CI build identifier. */
  readonly build: string;
  /** Release channel (e.g. stable). */
  readonly channel: string;
  /** Detected browser name and version. */
  readonly browser: string;
  /** Detected OS platform. */
  readonly platform: string;
  /** Eyebrow section heading label. */
  readonly heading: string;
  /** Copy button label (default state). */
  readonly copyLabel: string;
  /** Copy button label (success state). */
  readonly copiedLabel: string;
}

/** Builds the ordered diagnostics field array from individual values. */
function buildDiagFields(
  version: string,
  build: string,
  channel: string,
  browser: string,
  platform: string,
): readonly [string, string][] {
  return [
    ['version', version],
    ['build', build],
    ['channel', channel],
    ['browser', browser],
    ['platform', platform],
  ];
}

/** Header row for the diagnostics block: eyebrow + copy button. */
function DiagnosticsHeader({
  heading,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  readonly heading: string;
  readonly copied: boolean;
  readonly onCopy: () => void;
  readonly copyLabel: string;
  readonly copiedLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
      }}
    >
      <Eyebrow label={heading} />
      <CopyButton copied={copied} onCopy={onCopy} copyLabel={copyLabel} copiedLabel={copiedLabel} />
    </div>
  );
}

/** Monospace table card displaying the diagnostics fields. */
function DiagnosticsTable({ fields }: { readonly fields: readonly [string, string][] }) {
  return (
    <div
      style={{
        background: C.panel,
        border: BORDER_1,
        borderRadius: 6,
        padding: '12px 14px',
        fontFamily: MONO,
        fontSize: 11.5,
        lineHeight: 1.8,
        marginBottom: 22,
      }}
    >
      <DiagFieldRows fields={fields} />
    </div>
  );
}

/** Read-only table of build/env diagnostics with a one-click clipboard copy button. */
export function DiagnosticsBlock({
  version,
  build,
  channel,
  browser,
  platform,
  heading,
  copyLabel,
  copiedLabel,
}: DiagnosticsBlockProps) {
  const [copied, setCopied] = useState(false);
  const fields = buildDiagFields(version, build, channel, browser, platform);

  const handleCopy = () => {
    const text = fields.map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FLASH_MS);
  };

  return (
    <>
      <DiagnosticsHeader
        heading={heading}
        copied={copied}
        onCopy={handleCopy}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />
      <DiagnosticsTable fields={fields} />
    </>
  );
}

/** Props for the legal section. */
export interface LegalBlockProps {
  /** URL of the open-source licenses page. */
  readonly licensesUrl: string;
  /** Eyebrow heading label. */
  readonly heading: string;
  /** Visible link text for the licenses page. */
  readonly licensesLabel: string;
  /** Copyright line text. */
  readonly copyright: string;
}

/** Legal section — open-source licenses link and copyright line. */
export function LegalBlock({ licensesUrl, heading, licensesLabel, copyright }: LegalBlockProps) {
  return (
    <>
      <Eyebrow label={heading} />
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <a
          href={licensesUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: C.text,
            textDecoration: 'none',
            borderBottom: BORDER_1,
            paddingBottom: 1,
          }}
        >
          {licensesLabel}
        </a>
      </div>
      <p style={{ marginTop: 18, fontSize: 11, lineHeight: 1.6, color: C.subtle }}>{copyright}</p>
    </>
  );
}
