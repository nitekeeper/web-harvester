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

/** Props for parameterised icon size. */
interface SizedIconProps {
  /** Rendered pixel size; defaults to 14. */
  readonly size?: number;
}

/** Inline check icon. Defaults to 14 × 14 px, stroke 2.5. Pass `size={12}` for the copy-success state. */
export function CheckIcon({ size = 14 }: SizedIconProps = {}) {
  return (
    <IconSvg strokeWidth={2.5} joinRound size={size}>
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

/** Folder-plus glyph — 14 × 14 px. Used in destination picker trigger and settings nav. */
export function FolderIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </IconSvg>
  );
}

/** File glyph — 13 × 13 px. Used in template picker trigger and settings nav. */
export function FileIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound size={13}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </IconSvg>
  );
}

/** Three-line list glyph (last line shorter) — 14 × 14 px. Metadata settings nav icon. */
export function MetadataIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="14" y2="18" />
    </IconSvg>
  );
}

/** Globe/half-circle with horizontal midline — 14 × 14 px. Appearance settings nav icon. */
export function AppearanceIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </IconSvg>
  );
}

/** Info circle glyph — 14 × 14 px. About settings nav icon. */
export function AboutIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </IconSvg>
  );
}

/**
 * Puzzle-piece glyph — used for the Plugins settings nav entry and the
 * Plugins empty-state tile. Pass `size` (default 14) and `strokeWidth`
 * (default 2) to adapt between sidebar (14 / 2) and empty-state (22 / 1.8)
 * contexts.
 */
export function PluginIcon({
  size = 14,
  strokeWidth = 2,
}: {
  readonly size?: number;
  readonly strokeWidth?: number;
} = {}) {
  return (
    <IconSvg strokeWidth={strokeWidth} joinRound size={size}>
      <path d="M14 7V4a2 2 0 0 0-4 0v3H7a2 2 0 0 0-2 2v3h3a2 2 0 1 1 0 4H5v3a2 2 0 0 0 2 2h3v-3a2 2 0 1 1 4 0v3h3a2 2 0 0 0 2-2v-3h-3a2 2 0 1 1 0-4h3V9a2 2 0 0 0-2-2z" />
    </IconSvg>
  );
}

/** Props for icon components that need external className (e.g. for rotation). */
interface ClassedIconProps {
  /** Optional CSS class names applied to the SVG element. */
  readonly className?: string;
  /** Optional test-id forwarded to the SVG element. */
  readonly 'data-testid'?: string;
}

/** Chevron-down disclosure arrow — 11 × 11 px, stroke 2.5. Dropdown section toggle. */
export function ChevIcon({ className, 'data-testid': testId }: ClassedIconProps = {}) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      data-testid={testId}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Plus cross — 12 × 12 px, stroke 2.5. "New" / "Add" inline buttons. */
export function PlusIcon() {
  return (
    <IconSvg strokeWidth={2.5} size={12}>
      <path d="M12 5v14M5 12h14" />
    </IconSvg>
  );
}

/** Filled downward triangle — 9 × 9 px. Compact menus and select triggers. */
export function CaretDownIcon({ className }: { readonly className?: string } = {}) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

/** GitHub octocat mark — 14 × 14 px, stroke 1.5. Resource row leading icon. */
export function GitHubIcon() {
  return (
    <IconSvg strokeWidth={1.5} joinRound>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </IconSvg>
  );
}

/** Diagonal arrow into corner — 13 × 13 px, stroke 1.8. External-link trailing icon. */
export function ExternalArrowIcon() {
  return (
    <IconSvg strokeWidth={1.8} joinRound size={13}>
      <path d="M7 17L17 7M9 7h8v8" />
    </IconSvg>
  );
}

/** Clipboard outline — 12 × 12 px, stroke 1.8. Copy button default icon. */
export function ClipboardIcon() {
  return (
    <IconSvg strokeWidth={1.8} joinRound size={12}>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
    </IconSvg>
  );
}

/** Pencil edit icon — 11×11 px, stroke 2. Used on the Custom theme tile swatch. */
export function PencilIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound size={11}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </IconSvg>
  );
}
