// src/presentation/settings/sections/GeneralSection.tsx

import { Label } from '@presentation/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@presentation/components/ui/select';
import { Separator } from '@presentation/components/ui/separator';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { AppSettings } from '@shared/types';

/** Props for {@link GeneralSection}. */
export interface GeneralSectionProps {
  /** Current settings record. Defaults to the same defaults as the store. */
  readonly settings?: AppSettings;
  /** Called when the user edits one or more settings fields. */
  readonly onUpdate?: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  theme: 'system',
  locale: 'en',
  defaultDestinationId: null,
  defaultTemplateId: null,
  customCss: '',
  fontSize: 13,
};

const NOOP_UPDATE: (partial: Partial<AppSettings>) => void = () => undefined;

const LOCALE_OPTIONS: readonly { value: string; labelId: string; defaultLabel: string }[] = [
  { value: 'en', labelId: 'settings.general.locale.en', defaultLabel: 'English' },
  { value: 'ko', labelId: 'settings.general.locale.ko', defaultLabel: 'Korean' },
  { value: 'ja', labelId: 'settings.general.locale.ja', defaultLabel: 'Japanese' },
];

/**
 * Settings page section for the global app settings — currently the locale
 * picker. The full settings record is shown so future fields (e.g. version,
 * default destination/template) can be added without prop changes.
 */
export function GeneralSection({
  settings = DEFAULT_SETTINGS,
  onUpdate = NOOP_UPDATE,
}: GeneralSectionProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-3" data-testid="general-section">
      <h2 className="text-base font-medium">
        {fmt({ id: 'settings.general.heading', defaultMessage: 'General' })}
      </h2>
      <Separator />
      <div className="flex flex-col gap-2">
        <Label htmlFor="locale-select">
          {fmt({ id: 'settings.general.locale', defaultMessage: 'Locale' })}
        </Label>
        <Select value={settings.locale} onValueChange={(locale) => onUpdate({ locale })}>
          <SelectTrigger id="locale-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {fmt({ id: opt.labelId, defaultMessage: opt.defaultLabel })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
