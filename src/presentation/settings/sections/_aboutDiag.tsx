// src/presentation/settings/sections/_aboutDiag.tsx
//
// Diagnostics block sub-components used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { useEffect, useRef, useState } from 'react';

import { CheckIcon, ClipboardIcon } from '@presentation/components/icons';

import { BORDER_1, C, COPY_FLASH_MS, DIAG_LABELS, Eyebrow, MONO } from './_aboutShared';

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
function CopyButton({ copied, onCopy, copyLabel, copiedLabel }: CopyButtonProps) {
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
function DiagFieldRows({ fields }: { readonly fields: readonly [string, string][] }) {
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
interface DiagnosticsBlockProps {
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fields = buildDiagFields(version, build, channel, browser, platform);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = () => {
    const text = fields.map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => undefined);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), COPY_FLASH_MS);
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
