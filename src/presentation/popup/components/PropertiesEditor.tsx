import { useCallback, useEffect, useRef, useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import {
  parseFrontmatterFields,
  rebuildMarkdownWithFields,
  type FrontmatterField,
} from '@presentation/popup/lib/parseFrontmatter';

const INPUT_CLASS =
  'h-7 rounded border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

/** Props for {@link PropertiesEditor}. */
export interface PropertiesEditorProps {
  /** The full compiled markdown string (may include a YAML frontmatter block). */
  readonly markdown: string;
  /** Called with the rebuilt markdown string when a field value is edited. */
  readonly onMarkdownChange: (markdown: string) => void;
  /** When true and no fields are present, shows a loading skeleton instead of the empty state. */
  readonly isPreviewing?: boolean;
}

/** Props for {@link FieldItem}. */
interface FieldItemProps {
  /** Index in the fields array. */
  readonly index: number;
  /** The field to render. */
  readonly field: FrontmatterField;
  /** Called when the field value changes. */
  readonly onFieldChange: (index: number, value: string) => void;
}

/**
 * Renders a single field input with label.
 * @param props The field item props.
 * @returns JSX element.
 */
function FieldItem({ index, field: { key, value }, onFieldChange }: FieldItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={`prop-${key}`} className="text-[10.5px] text-muted-foreground font-mono">
        {key}
      </label>
      <input
        id={`prop-${key}`}
        type="text"
        data-testid={`prop-input-${key}`}
        value={value}
        onChange={(e) => onFieldChange(index, e.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  );
}

/** Shown in place of the field list when no frontmatter has been clipped yet. */
function PropertiesEmptyState() {
  const fmt = useFormatMessage();
  return (
    <div data-testid="properties-editor">
      <span data-testid="properties-empty" className="text-[11px] italic text-muted-foreground">
        {fmt({
          id: 'popup.propertiesEmpty',
          defaultMessage: 'Properties will appear after clipping',
        })}
      </span>
    </div>
  );
}

/** Shown while a live preview is in flight and no fields have arrived yet. */
function PropertiesLoadingState() {
  const fmt = useFormatMessage();
  return (
    <div data-testid="properties-editor">
      <span
        data-testid="properties-loading"
        className="text-[11px] italic text-muted-foreground animate-pulse"
      >
        {fmt({ id: 'popup.propertiesLoading', defaultMessage: 'Loading properties…' })}
      </span>
    </div>
  );
}

/**
 * Renders an editable text input for each YAML frontmatter key-value pair.
 * Shows a placeholder when the markdown contains no frontmatter block.
 */
export function PropertiesEditor({
  markdown,
  onMarkdownChange,
  isPreviewing = false,
}: PropertiesEditorProps) {
  const [fields, setFields] = useState<FrontmatterField[]>(() => parseFrontmatterFields(markdown));
  const lastExternalRef = useRef(markdown);

  useEffect(() => {
    if (lastExternalRef.current !== markdown) {
      lastExternalRef.current = markdown;
      setFields(parseFrontmatterFields(markdown));
    }
  }, [markdown]);

  const handleChange = useCallback(
    (index: number, newValue: string): void => {
      setFields((prev) => {
        const updated = prev.map((f, i) => (i === index ? { key: f.key, value: newValue } : f));
        const newMarkdown = rebuildMarkdownWithFields(markdown, updated);
        lastExternalRef.current = newMarkdown;
        onMarkdownChange(newMarkdown);
        return updated;
      });
    },
    [markdown, onMarkdownChange],
  );

  if (fields.length === 0) {
    if (isPreviewing) return <PropertiesLoadingState />;
    return <PropertiesEmptyState />;
  }

  return (
    <div data-testid="properties-editor" className="flex flex-col gap-1.5">
      {fields.map((field, index) => (
        <FieldItem key={field.key} index={index} field={field} onFieldChange={handleChange} />
      ))}
    </div>
  );
}
