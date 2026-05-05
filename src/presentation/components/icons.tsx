// src/presentation/components/icons.tsx
//
// Shared inline glyph components used across the popup chrome (status bar,
// action footer, header). Each glyph wraps {@link IconSvg} with the SVG body
// for that icon. Centralised here so the same `<path>`/`<polyline>` markup
// does not appear in multiple component files — keeps `pnpm lint:dupes` happy
// and gives the UI a single visual vocabulary.

import { IconSvg } from '@presentation/components/IconSvg';

/** Inline spinner icon — 14 × 14 px, animated by the shared `spin` keyframe. */
export function SpinIcon() {
  return (
    <IconSvg strokeWidth={2.5} style={{ animation: 'spin 0.9s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconSvg>
  );
}

/** Inline check icon — 14 × 14 px. */
export function CheckIcon() {
  return (
    <IconSvg strokeWidth={2.5} joinRound>
      <polyline points="20 6 9 17 4 12" />
    </IconSvg>
  );
}

/** Inline warning triangle icon — 14 × 14 px. */
export function WarnIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconSvg>
  );
}
