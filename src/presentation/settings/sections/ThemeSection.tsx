// src/presentation/settings/sections/ThemeSection.tsx

import { useState } from 'react';

import { Alert, AlertDescription } from '@presentation/components/ui/alert';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { createLogger } from '@shared/logger';

import { Button, Input, Label, Separator, Textarea } from './_ui';

/** Discriminated union of supported theme preferences. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Props for {@link ThemeSection}. */
export interface ThemeSectionProps {
  /** Currently active theme preference. Defaults to `'system'`. */
  readonly currentTheme?: ThemePreference;
  /** Map of CSS custom property names to colour values. Defaults to `{}`. */
  readonly colorTokens?: Record<string, string>;
  /** Called when the user picks a new theme preference. */
  readonly onThemeChange?: (theme: ThemePreference) => void;
  /** Called when the user edits an individual token value. */
  readonly onTokensChange?: (tokens: Record<string, string>) => void;
  /** Returns the JSON serialisation of the current tokens for export. */
  readonly onExportTokens?: () => string;
  /** Imports a JSON token bundle. Rejects when the input is invalid. */
  readonly onImportTokens?: (json: string) => Promise<void>;
}

const logger = createLogger('theme-section');
const NOOP_THEME: (theme: ThemePreference) => void = () => undefined;
const NOOP_TOKENS: (tokens: Record<string, string>) => void = () => undefined;
const NOOP_EXPORT: () => string = () => '{}';
const NOOP_IMPORT: (json: string) => Promise<void> = async () => undefined;
const THEME_OPTIONS: readonly { value: ThemePreference; labelId: string; defaultLabel: string }[] =
  [
    { value: 'light', labelId: 'settings.theme.light', defaultLabel: 'Light' },
    { value: 'dark', labelId: 'settings.theme.dark', defaultLabel: 'Dark' },
    { value: 'system', labelId: 'settings.theme.system', defaultLabel: 'System' },
  ];

/** Props for {@link ThemeRadios}. */
interface ThemeRadioProps {
  /** Currently active theme preference. */
  readonly currentTheme: ThemePreference;
  /** Called when the user picks a new preference. */
  readonly onThemeChange: (theme: ThemePreference) => void;
}

/**
 * Renders the three theme radio buttons. Extracted so {@link ThemeSection}
 * stays inside the per-function line cap and so the radio cluster can be
 * rendered in isolation by future wrappers.
 */
function ThemeRadios({ currentTheme, onThemeChange }: ThemeRadioProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {THEME_OPTIONS.map((opt) => {
        const text = fmt({ id: opt.labelId, defaultMessage: opt.defaultLabel });
        return (
          <Label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              value={opt.value}
              aria-label={opt.value}
              checked={currentTheme === opt.value}
              onChange={() => onThemeChange(opt.value)}
            />
            <span>{text}</span>
          </Label>
        );
      })}
    </div>
  );
}

/** Props for {@link TokenEditor}. */
interface TokenEditorProps {
  /** Map of CSS custom property names to colour values. */
  readonly colorTokens: Record<string, string>;
  /** Called when the user edits an individual token value. */
  readonly onTokensChange: (tokens: Record<string, string>) => void;
}

/**
 * Renders one labelled `<Input>` per colour token. A copy of the tokens
 * record is mutated and passed back to the parent so callers can persist the
 * change without reaching into internal state.
 */
function TokenEditor({ colorTokens, onTokensChange }: TokenEditorProps) {
  const fmt = useFormatMessage();
  const entries = Object.entries(colorTokens);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {fmt({
          id: 'settings.theme.tokens.empty',
          defaultMessage: 'No custom colour tokens defined.',
        })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <Label className="w-40 shrink-0 font-mono text-xs">{key}</Label>
          <Input
            value={value}
            onChange={(e) => onTokensChange({ ...colorTokens, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/** Props for {@link ImportExport}. */
interface ImportExportProps {
  /** Returns the JSON serialisation of the current tokens for export. */
  readonly onExportTokens: () => string;
  /** Imports a JSON token bundle. Rejects when the input is invalid. */
  readonly onImportTokens: (json: string) => Promise<void>;
}

/** Slice returned by {@link useImportExportController}. */
interface ImportExportController {
  /** Current draft text shown in the textarea. */
  readonly draft: string;
  /** Setter wired to the textarea's `onChange`. */
  readonly setDraft: (value: string) => void;
  /** Last import error message, or `null` when none is pending. */
  readonly error: string | null;
  /** Click handler for the "Import" button. */
  readonly handleImportClick: () => void;
  /** Click handler for the "Export" button. */
  readonly handleExportClick: () => void;
}

/**
 * Encapsulates the import/export draft + error state and the click handlers.
 * Pulled out so the renderable component below stays under the per-function
 * line cap.
 */
function useImportExportController({
  onExportTokens,
  onImportTokens,
}: ImportExportProps): ImportExportController {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (): Promise<void> => {
    setError(null);
    try {
      // Surface JSON parse errors locally so the user sees a message even
      // when the host hasn't wired a validating import handler yet.
      JSON.parse(draft);
      await onImportTokens(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return {
    draft,
    setDraft,
    error,
    handleImportClick: () => {
      handleImport().catch((err: unknown) => logger.error('import failed', err));
    },
    handleExportClick: () => {
      try {
        setDraft(onExportTokens());
      } catch (err) {
        logger.error('export failed', err);
      }
    },
  };
}

/** Props for {@link ImportExportButtons}. */
interface ImportExportButtonsProps {
  /** Click handler for the "Import" button. */
  readonly handleImportClick: () => void;
  /** Click handler for the "Export" button. */
  readonly handleExportClick: () => void;
}

/** Import/export action button cluster. */
function ImportExportButtons({ handleImportClick, handleExportClick }: ImportExportButtonsProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex gap-2">
      <Button data-testid="import-tokens-submit" size="sm" onClick={handleImportClick}>
        {fmt({ id: 'settings.theme.tokens.import.submit', defaultMessage: 'Import' })}
      </Button>
      <Button data-testid="export-tokens" size="sm" variant="outline" onClick={handleExportClick}>
        {fmt({ id: 'settings.theme.tokens.export', defaultMessage: 'Export' })}
      </Button>
    </div>
  );
}

/**
 * Renders the import/export controls and the inline error surface. Splitting
 * this out keeps the parent {@link ThemeSection} focused on layout while the
 * import flow keeps its own draft and error state.
 */
function ImportExport(props: ImportExportProps) {
  const fmt = useFormatMessage();
  const { draft, setDraft, error, handleImportClick, handleExportClick } =
    useImportExportController(props);
  return (
    <div className="flex flex-col gap-2">
      <Label>
        {fmt({ id: 'settings.theme.tokens.import', defaultMessage: 'Import tokens (JSON)' })}
      </Label>
      <Textarea
        data-testid="import-tokens-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <ImportExportButtons
        handleImportClick={handleImportClick}
        handleExportClick={handleExportClick}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/**
 * Settings page section for theme preference and colour token customisation.
 * Composed from three subcomponents — radio cluster, token editor, and
 * import/export panel — so each piece stays under the function-size cap.
 * All handlers are optional so the SPA shell can render the section without
 * wiring before the composition root lands.
 */
export function ThemeSection({
  currentTheme = 'system',
  colorTokens = {},
  onThemeChange = NOOP_THEME,
  onTokensChange = NOOP_TOKENS,
  onExportTokens = NOOP_EXPORT,
  onImportTokens = NOOP_IMPORT,
}: ThemeSectionProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-3" data-testid="theme-section">
      <h2 className="text-base font-medium">
        {fmt({ id: 'settings.theme.heading', defaultMessage: 'Theme' })}
      </h2>
      <Separator />
      <ThemeRadios currentTheme={currentTheme} onThemeChange={onThemeChange} />
      <Separator />
      <h3 className="text-sm font-medium">
        {fmt({ id: 'settings.theme.tokens.heading', defaultMessage: 'Colour tokens' })}
      </h3>
      <TokenEditor colorTokens={colorTokens} onTokensChange={onTokensChange} />
      <Separator />
      <ImportExport onExportTokens={onExportTokens} onImportTokens={onImportTokens} />
    </div>
  );
}
