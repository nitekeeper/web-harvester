// src/presentation/settings/sections/AppearanceSection.tsx

import { type ReactNode } from 'react';

import { ChevIcon } from '@presentation/components/icons';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

/** BCP-47 locale codes supported by the application UI. */
type SupportedLocale = 'en' | 'ko' | 'ja';

const LOCALE_LABEL_EN = 'English';
const LOCALE_LABEL_KO = '한국어 · Korean';
const LOCALE_LABEL_JA = '日本語 · Japanese';
const COLOR_MUTED = 'var(--wh-muted)';

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
  color: 'var(--wh-text)',
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
          color: 'var(--wh-text)',
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
 * Settings section for visual preferences: language, theme, custom CSS,
 * and preview font size. Reads from and writes to the singleton settings
 * store — no props required.
 */
export function AppearanceSection() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const fmt = useFormatMessage();

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
    </div>
  );
}
