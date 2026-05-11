// src/presentation/settings/sections/AppearanceSection.tsx

import { type ReactNode, useEffect } from 'react';

import { ChevIcon } from '@presentation/components/icons';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { applyThemeToDocument } from '@presentation/theme/applyTheme';
import type { AppSettings } from '@shared/types';

import { CustomCssField } from './CustomCssField';

/** BCP-47 locale codes supported by the application UI. */
type SupportedLocale = 'en' | 'ko' | 'ja';

/** Theme preference values mirrored from AppSettings. */
type ThemePreference = AppSettings['theme'];

const LOCALE_LABEL_EN = 'English';
const LOCALE_LABEL_KO = '한국어 · Korean';
const LOCALE_LABEL_JA = '日本語 · Japanese';
const COLOR_MUTED = 'var(--wh-muted)';
const COLOR_TEXT = 'var(--wh-text)';

const LOCALE_OPTIONS: readonly { value: SupportedLocale; label: string }[] = [
  { value: 'en', label: LOCALE_LABEL_EN },
  { value: 'ko', label: LOCALE_LABEL_KO },
  { value: 'ja', label: LOCALE_LABEL_JA },
];

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: COLOR_MUTED,
};

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'var(--wh-panel)',
  border: '1px solid var(--wh-border)',
  borderRadius: 5,
  padding: '7px 32px 7px 10px',
  fontSize: 12.5,
  color: COLOR_TEXT,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const CHEV_WRAPPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: COLOR_MUTED,
  lineHeight: 0,
};

/** Eyebrow-caps field label per Design Handoff §6.7. */
function FieldLabel({ children }: { readonly children: ReactNode }) {
  return <span style={FIELD_LABEL_STYLE}>{children}</span>;
}

/** Locale picker with a custom chevron overlay. */
function LanguageField({
  value,
  onChange,
}: {
  readonly value: SupportedLocale;
  readonly onChange: (v: SupportedLocale) => void;
}) {
  const fmt = useFormatMessage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FieldLabel>
        {fmt({ id: 'settings.appearance.language', defaultMessage: 'Language' })}
      </FieldLabel>
      <div style={{ position: 'relative', maxWidth: 280 }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SupportedLocale)}
          style={SELECT_STYLE}
        >
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={CHEV_WRAPPER_STYLE}>
          <ChevIcon />
        </span>
      </div>
    </div>
  );
}

/** Visual fill values for a single theme tile swatch. */
interface SwatchSpec {
  bg: string;
  bar1: string;
  bar2: string;
  accent: string;
}

const SWATCH_ACCENT = '#10b981';
const SWATCH_LIGHT_BAR1 = 'rgba(10,10,10,0.18)';
const SWATCH_LIGHT_BAR2 = 'rgba(10,10,10,0.12)';
const SWATCH_DARK_BAR1 = 'rgba(250,250,249,0.18)';
const SWATCH_DARK_BAR2 = 'rgba(250,250,249,0.12)';

const SWATCHES: Record<ThemePreference, SwatchSpec> = {
  light: { bg: '#fafaf9', bar1: SWATCH_LIGHT_BAR1, bar2: SWATCH_LIGHT_BAR2, accent: SWATCH_ACCENT },
  dark: { bg: '#0f1011', bar1: SWATCH_DARK_BAR1, bar2: SWATCH_DARK_BAR2, accent: SWATCH_ACCENT },
  system: {
    bg: 'linear-gradient(120deg, #fafaf9 50%, #0f1011 50%)',
    bar1: SWATCH_LIGHT_BAR1,
    bar2: SWATCH_LIGHT_BAR2,
    accent: SWATCH_ACCENT,
  },
  custom: { bg: '#0f1011', bar1: SWATCH_DARK_BAR1, bar2: SWATCH_DARK_BAR2, accent: SWATCH_ACCENT },
};

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  custom: 'Custom',
};

const THEME_OPTIONS: readonly ThemePreference[] = ['light', 'dark', 'system'];

/** Mini browser-chrome swatch inside a theme tile. */
function ThemeSwatch({ s }: { readonly s: SwatchSpec }) {
  return (
    <div
      style={{
        height: 80,
        borderRadius: 4,
        padding: 8,
        background: s.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ height: 8, width: 50, background: s.bar1, borderRadius: 2 }} />
      <div style={{ height: 6, width: 70, background: s.bar2, borderRadius: 2 }} />
      <div style={{ height: 6, width: 40, background: s.bar2, borderRadius: 2 }} />
      <div style={{ marginTop: 'auto', height: 14, background: s.accent, borderRadius: 3 }} />
    </div>
  );
}

/** Single theme tile button with mini swatch preview. */
function ThemeTile({
  theme,
  isSelected,
  onClick,
}: {
  readonly theme: ThemePreference;
  readonly isSelected: boolean;
  readonly onClick: () => void;
}) {
  // eslint-disable-next-line security/detect-object-injection
  const s = Object.prototype.hasOwnProperty.call(SWATCHES, theme) ? SWATCHES[theme] : SWATCHES.dark;
  const label = Object.prototype.hasOwnProperty.call(THEME_LABELS, theme)
    ? // eslint-disable-next-line security/detect-object-injection
      THEME_LABELS[theme]
    : theme;
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      style={{
        width: 152,
        padding: 8,
        border: `2px solid ${isSelected ? 'var(--wh-accent)' : 'var(--wh-border)'}`,
        borderRadius: 8,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <ThemeSwatch s={s} />
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: COLOR_TEXT }}>{label}</div>
    </button>
  );
}

/** Three-tile theme selector (Light / Dark / System). */
function ThemeField({
  value,
  onChange,
}: {
  readonly value: ThemePreference;
  readonly onChange: (v: ThemePreference) => void;
}) {
  const fmt = useFormatMessage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FieldLabel>{fmt({ id: 'settings.appearance.theme', defaultMessage: 'Theme' })}</FieldLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        {THEME_OPTIONS.map((t) => (
          <ThemeTile key={t} theme={t} isSelected={value === t} onClick={() => onChange(t)} />
        ))}
      </div>
    </div>
  );
}

/** Page heading block with title and description. */
function PageChrome({
  fmt,
}: {
  readonly fmt: (d: { id: string; defaultMessage: string }) => string;
}) {
  return (
    <div>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: COLOR_TEXT,
          margin: 0,
        }}
      >
        {fmt({ id: 'settings.appearance.heading', defaultMessage: 'Appearance' })}
      </h1>
      <p style={{ fontSize: 12.5, color: COLOR_MUTED, margin: '4px 0 0' }}>
        {fmt({
          id: 'settings.appearance.description',
          defaultMessage:
            'Theme, language, and visual preferences for popup, settings, and side panel.',
        })}
      </p>
    </div>
  );
}

/**
 * Settings section for visual preferences: language, theme, and custom CSS.
 * Reads from and writes to the singleton settings store — no props required.
 */
export function AppearanceSection() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const fmt = useFormatMessage();

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDocument('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  return (
    <div
      data-testid="appearance-section"
      style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <PageChrome fmt={fmt} />
      <LanguageField
        value={settings.locale as SupportedLocale}
        onChange={(locale) => updateSettings({ locale })}
      />
      <ThemeField
        value={settings.theme}
        onChange={(theme) => {
          updateSettings({ theme });
          applyThemeToDocument(theme);
        }}
      />
      <CustomCssField
        value={settings.customCss}
        theme={settings.theme}
        onChange={(customCss) => updateSettings({ customCss })}
      />
    </div>
  );
}
