// src/presentation/popup/components/TemplateSelector.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@presentation/components/ui/select';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { TemplateConfig } from '@shared/types';

/** Props for {@link TemplateSelector}. */
export interface TemplateSelectorProps {
  /** Available clip templates to render in the dropdown. */
  readonly templates: readonly TemplateConfig[];
  /** Currently selected template id, or `null` when none is chosen. */
  readonly selectedId: string | null;
  /** Called with the chosen template id when the user picks one. */
  readonly onSelect: (id: string) => void;
}

/**
 * Renders the popup's template picker. Always mounts the trigger so plugins
 * and tests can locate the slot via `data-testid`, even when the templates
 * list is empty.
 */
export function TemplateSelector({ templates, selectedId, onSelect }: TemplateSelectorProps) {
  const fmt = useFormatMessage();

  return (
    <Select value={selectedId ?? undefined} onValueChange={onSelect}>
      <SelectTrigger data-testid="template-selector" className="w-full">
        <SelectValue
          placeholder={fmt({ id: 'popup.selectTemplate', defaultMessage: 'Select template…' })}
        />
      </SelectTrigger>
      <SelectContent>
        {templates.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
