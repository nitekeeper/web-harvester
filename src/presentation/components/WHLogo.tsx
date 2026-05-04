// src/presentation/components/WHLogo.tsx
//
// Web Harvester logo — a point-up C6 hex gem with six triangular faces.
// Each face uses `currentColor` at decreasing opacity to simulate depth, so
// the rendered colour is controlled entirely by the parent's Tailwind
// `text-*` class (or any inherited CSS `color`).

/** Props for {@link WHLogo}. */
export interface WHLogoProps {
  /** Width and height in pixels. Defaults to 18. */
  readonly size?: number;
  /** Extra CSS classes passed to the `<svg>` element — use Tailwind `text-*` to set color. */
  readonly className?: string;
}

/**
 * Web Harvester logo — a point-up C6 hex gem with six triangular faces.
 * Each face is filled with `currentColor` at decreasing opacity to simulate
 * depth, so the rendered color is controlled entirely by the parent's
 * Tailwind `text-*` class (or inherited CSS `color`).
 */
export function WHLogo({ size = 18, className }: WHLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(30 32 32)">
        {/* top-right — brightest face */}
        <path d="M32 6 L54 18 L32 32 Z" fill="currentColor" fillOpacity="1" />
        {/* right */}
        <path d="M54 18 L54 46 L32 32 Z" fill="currentColor" fillOpacity="0.82" />
        {/* bottom-right */}
        <path d="M54 46 L32 58 L32 32 Z" fill="currentColor" fillOpacity="0.62" />
        {/* bottom-left — deepest shadow */}
        <path d="M32 58 L10 46 L32 32 Z" fill="currentColor" fillOpacity="0.42" />
        {/* left */}
        <path d="M10 46 L10 18 L32 32 Z" fill="currentColor" fillOpacity="0.42" />
        {/* top-left */}
        <path d="M10 18 L32 6 L32 32 Z" fill="currentColor" fillOpacity="0.82" />
      </g>
    </svg>
  );
}
