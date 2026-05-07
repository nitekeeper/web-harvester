import type { ReaderSettings } from '@application/ReaderService';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useReaderStore } from '@presentation/stores/useReaderStore';

/** Props for the internal {@link ReaderSlider} helper. */
interface ReaderSliderProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (v: number) => void;
}

/** A labeled range slider for a single numeric reader setting. */
function ReaderSlider({ id, label, value, min, max, step, onChange }: ReaderSliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[11px] text-muted-foreground">
          {label}
        </label>
        <span className="text-[11px] text-muted-foreground tabular-nums">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-primary cursor-pointer"
      />
    </div>
  );
}

/** Props for the internal {@link ReaderSelect} helper. */
interface ReaderSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly { value: string; label: string }[];
  readonly onChange: (v: string) => void;
}

/** A labeled select for a string-valued reader setting. */
function ReaderSelect({ id, label, value, options, onChange }: ReaderSelectProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-[11px] text-muted-foreground shrink-0">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 rounded border border-input bg-background px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sepia', label: 'Sepia' },
] as const;

const FONT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-Serif' },
  { value: 'monospace', label: 'Monospace' },
] as const;

/** Props shared by settings sub-panels. */
interface SettingsPatch {
  readonly settings: ReaderSettings;
  readonly setSettings: (patch: Partial<ReaderSettings>) => void;
}

/** Renders the three numeric sliders (font size, line height, max width). */
function ReaderSliders({ settings, setSettings }: SettingsPatch) {
  const fmt = useFormatMessage();
  return (
    <>
      <ReaderSlider
        id="reader-font-size"
        label={fmt({ id: 'sidepanel.reader.fontSize', defaultMessage: 'Font size' })}
        value={settings.fontSize}
        min={12}
        max={24}
        step={1}
        onChange={(v) => setSettings({ fontSize: v })}
      />
      <ReaderSlider
        id="reader-line-height"
        label={fmt({ id: 'sidepanel.reader.lineHeight', defaultMessage: 'Line height' })}
        value={settings.lineHeight}
        min={1.2}
        max={2.4}
        step={0.1}
        onChange={(v) => setSettings({ lineHeight: v })}
      />
      <ReaderSlider
        id="reader-max-width"
        label={fmt({ id: 'sidepanel.reader.maxWidth', defaultMessage: 'Max width' })}
        value={settings.maxWidth}
        min={30}
        max={60}
        step={2}
        onChange={(v) => setSettings({ maxWidth: v })}
      />
    </>
  );
}

/** Renders the theme/font selects and the show-highlights checkbox. */
function ReaderControls({ settings, setSettings }: SettingsPatch) {
  const fmt = useFormatMessage();
  return (
    <>
      <ReaderSelect
        id="reader-theme"
        label={fmt({ id: 'sidepanel.reader.theme', defaultMessage: 'Theme' })}
        value={settings.theme}
        options={THEME_OPTIONS}
        onChange={(v) => setSettings({ theme: v as ReaderSettings['theme'] })}
      />
      <ReaderSelect
        id="reader-font-family"
        label={fmt({ id: 'sidepanel.reader.fontFamily', defaultMessage: 'Font' })}
        value={settings.fontFamily}
        options={FONT_OPTIONS}
        onChange={(v) => setSettings({ fontFamily: v })}
      />
      <div className="flex items-center justify-between">
        <label htmlFor="reader-show-highlights" className="text-[11px] text-muted-foreground">
          {fmt({ id: 'sidepanel.reader.showHighlights', defaultMessage: 'Show highlights' })}
        </label>
        <input
          id="reader-show-highlights"
          data-testid="reader-show-highlights"
          type="checkbox"
          checked={settings.showHighlights}
          onChange={(e) => setSettings({ showHighlights: e.target.checked })}
          className="accent-primary"
        />
      </div>
    </>
  );
}

/** The expanded settings panel shown when reader mode is active. */
function ReaderSettingsPanel({ settings, setSettings }: SettingsPatch) {
  return (
    <div data-testid="reader-settings" className="flex flex-col gap-3 pt-1 border-t border-border">
      <ReaderSliders settings={settings} setSettings={setSettings} />
      <ReaderControls settings={settings} setSettings={setSettings} />
    </div>
  );
}

/** Props for the internal {@link ReaderToggle} helper. */
interface ReaderToggleProps {
  readonly isActive: boolean;
  readonly onToggle: () => void;
}

/** The toggle button row at the top of the Reader tab. */
function ReaderToggle({ isActive, onToggle }: ReaderToggleProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] font-medium">
        {fmt({ id: 'sidepanel.reader.title', defaultMessage: 'Reader Mode' })}
      </span>
      <button
        data-testid="reader-toggle"
        aria-pressed={isActive}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isActive ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            isActive ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
        <span className="sr-only">
          {isActive
            ? fmt({ id: 'sidepanel.reader.disable', defaultMessage: 'Disable reader mode' })
            : fmt({ id: 'sidepanel.reader.enable', defaultMessage: 'Enable reader mode' })}
        </span>
      </button>
    </div>
  );
}

/** Props for {@link ReaderTab}. */
export interface ReaderTabProps {
  /** Called when the user clicks the reader-mode toggle; triggers IPC to background. Defaults to store toggle. */
  readonly onReaderToggle?: () => void;
}

/**
 * Content for the Reader tab in the side panel. Renders a toggle to enable or
 * disable reader mode (stored in {@link usePopupStore} so the popup footer
 * button stays in sync) and a settings panel — font size, line height, max
 * width, theme, font family, and highlight visibility — that is only shown
 * while reader mode is active. Settings are persisted via {@link useReaderStore}.
 */
export function ReaderTab({ onReaderToggle }: ReaderTabProps = {}) {
  const isReaderActive = usePopupStore((s) => s.isReaderActive);
  const setReaderActive = usePopupStore((s) => s.setReaderActive);
  const settings = useReaderStore((s) => s.settings);
  const setSettings = useReaderStore((s) => s.setSettings);

  const handleToggle = onReaderToggle ?? (() => setReaderActive(!isReaderActive));

  return (
    <div data-testid="reader-tab" className="flex flex-col gap-3 p-3">
      <ReaderToggle isActive={isReaderActive} onToggle={handleToggle} />
      {isReaderActive && <ReaderSettingsPanel settings={settings} setSettings={setSettings} />}
    </div>
  );
}
