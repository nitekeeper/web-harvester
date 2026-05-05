// src/presentation/components/IconSvg.tsx
//
// Shared 14 × 14 SVG wrapper used by every inline glyph in the popup chrome
// (status bar, header). Centralised here so the four `<svg>` shells in
// `StatusBar` and the four in `PopupHeader` collapse to a single primitive —
// keeps `pnpm lint:dupes` happy and gives the rest of the popup a single
// place to tweak default icon attributes.

import type { CSSProperties, ReactNode } from 'react';

/** Props for the shared {@link IconSvg} wrapper. */
export interface IconSvgProps {
  /** Stroke width applied to the inline SVG path(s). */
  readonly strokeWidth: number;
  /** Whether to round line joins (used by glyphs with corners — check, warn, etc.). */
  readonly joinRound?: boolean;
  /** Optional inline style — used by the spinner for its rotation animation. */
  readonly style?: CSSProperties;
  /** SVG body — `<path>`, `<polyline>`, `<line>`, etc. */
  readonly children: ReactNode;
}

/**
 * Shared 14 × 14 SVG wrapper with the attributes common to every inline glyph
 * rendered in the popup chrome. Sets viewBox to `0 0 24 24`, `fill="none"`,
 * `stroke="currentColor"`, and rounded line caps; consumers pass `strokeWidth`
 * and the path body via `children`.
 */
export function IconSvg({ strokeWidth, joinRound, style, children }: IconSvgProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin={joinRound ? 'round' : undefined}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
