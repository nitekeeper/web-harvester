// src/presentation/popup/components/PopupHeader.tsx
//
// Header bar for the popup surface: WHLogo + title + spacer + theme toggle
// dropdown + gear settings button. Selecting a theme calls `onTheme(theme)`
// and immediately toggles the `.dark` class on `document.documentElement` so
// the chrome reflows without waiting for the settings store round-trip.

import { useState } from 'react';

import { IconSvg } from '@presentation/components/IconSvg';
import { WHLogo } from '@presentation/components/WHLogo';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Active theme value accepted by {@link PopupHeader}. */
export type Theme = 'light' | 'dark' | 'system';

/** Props for {@link PopupHeader}. */
export interface PopupHeaderProps {
  /** Currently active theme. */
  readonly theme: Theme;
  /** Called when the user selects a new theme from the dropdown. */
  readonly onTheme: (theme: Theme) => void;
  /** Called when the user clicks the settings gear icon. */
  readonly onSettings: () => void;
}

/** Sun icon 14 × 14 px (light theme). */
function SunIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </IconSvg>
  );
}

/** Moon icon 14 × 14 px (dark theme). */
function MoonIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </IconSvg>
  );
}

/** Monitor icon 14 × 14 px (system theme). */
function MonitorIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </IconSvg>
  );
}

/** Gear icon 14 × 14 px (settings). */
function GearIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconSvg>
  );
}

/** Returns the icon glyph for the supplied theme value. */
function themeIcon(theme: Theme) {
  if (theme === 'light') return <SunIcon />;
  if (theme === 'dark') return <MoonIcon />;
  return <MonitorIcon />;
}

/** Applies `theme` immediately to `document.documentElement` via the `.dark` class. */
function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

/** Static descriptor for each theme option rendered in the dropdown. */
const THEME_OPTIONS: readonly { value: Theme; labelId: string; defaultLabel: string }[] = [
  { value: 'light', labelId: 'popup.header.theme.light', defaultLabel: 'Light' },
  { value: 'dark', labelId: 'popup.header.theme.dark', defaultLabel: 'Dark' },
  { value: 'system', labelId: 'popup.header.theme.system', defaultLabel: 'System' },
];

/** Shared Tailwind class string for the two icon buttons in the header. */
const ICON_BTN_CLASS =
  'flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:bg-muted transition-colors';

/** Inline theme dropdown rendered beneath the theme toggle button. */
function ThemeMenu({
  current,
  onSelect,
  onClose,
}: {
  readonly current: Theme;
  readonly onSelect: (theme: Theme) => void;
  readonly onClose: () => void;
}) {
  const fmt = useFormatMessage();
  return (
    <div
      onMouseLeave={onClose}
      className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-md shadow-md p-1 min-w-[110px] z-50"
    >
      {THEME_OPTIONS.map(({ value, labelId, defaultLabel }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`flex items-center gap-2 w-full px-2 py-1 rounded text-[11.5px] text-left cursor-pointer hover:bg-muted ${current === value ? 'bg-muted font-semibold' : ''}`}
        >
          {themeIcon(value)}
          {fmt({ id: labelId, defaultMessage: defaultLabel })}
        </button>
      ))}
    </div>
  );
}

/** Theme toggle button + dropdown menu, fully self-contained. */
function ThemeToggle({
  theme,
  onTheme,
}: {
  readonly theme: Theme;
  readonly onTheme: (t: Theme) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fmt = useFormatMessage();

  function handleSelect(next: Theme): void {
    applyThemeClass(next);
    onTheme(next);
    setMenuOpen(false);
  }

  return (
    <div className="relative">
      <button
        data-testid="header-theme-btn"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={fmt({ id: `popup.header.theme.${theme}`, defaultMessage: theme })}
        className={ICON_BTN_CLASS}
      >
        {themeIcon(theme)}
      </button>
      {menuOpen && (
        <ThemeMenu current={theme} onSelect={handleSelect} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

/**
 * Header bar for the popup surface. Displays the WHLogo, the app name, a
 * theme-toggle dropdown, and a gear button that opens extension settings.
 */
export function PopupHeader({ theme, onTheme, onSettings }: PopupHeaderProps) {
  const fmt = useFormatMessage();

  return (
    <div
      data-testid="popup-header"
      className="flex items-center gap-2 px-2.5 py-2 border-b border-border bg-card"
    >
      <WHLogo size={22} className="text-primary shrink-0" />
      <span className="text-[12.5px] font-semibold tracking-tight">
        {fmt({ id: 'popup.header.title', defaultMessage: 'Web Harvester' })}
      </span>

      <div className="flex-1" />

      <ThemeToggle theme={theme} onTheme={onTheme} />

      <button
        data-testid="header-settings-btn"
        onClick={onSettings}
        aria-label={fmt({ id: 'popup.header.settings', defaultMessage: 'Settings' })}
        className={ICON_BTN_CLASS}
      >
        <GearIcon />
      </button>
    </div>
  );
}
