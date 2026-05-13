// src/presentation/settings/sections/_aboutResources.tsx
//
// Resources card sub-components used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { useState } from 'react';

import { ExternalArrowIcon } from '@presentation/components/icons';

import { BORDER_1, C, Eyebrow, MONO } from './_aboutShared';

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
function ResourceRow({ def, isLast }: { readonly def: ResourceRowDef; readonly isLast: boolean }) {
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
