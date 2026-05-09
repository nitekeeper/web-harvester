// src/presentation/settings/sections/TemplatesSection.tsx
//
// Settings page section for clip templates. Lists every persisted template,
// allows inline editing of the editable fields (name, body, note name), and
// exposes an "Add new template" form at the bottom of the list.

import { useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { createLogger } from '@shared/logger';
import type { TemplateConfig } from '@shared/types';

import { Button, Input, Label, Separator, Textarea } from './_ui';

/** Props for {@link TemplatesSection}. */
export interface TemplatesSectionProps {
  /** Persisted templates to render. Defaults to an empty list. */
  readonly templates?: readonly TemplateConfig[];
  /** Adds a new template; receives every field except the generated id. */
  readonly onAdd?: (template: Omit<TemplateConfig, 'id'>) => Promise<void>;
  /** Removes the template identified by `id`. */
  readonly onRemove?: (id: string) => Promise<void>;
  /** Updates one or more fields on the template identified by `id`. */
  readonly onUpdate?: (id: string, changes: Partial<TemplateConfig>) => Promise<void>;
}

const logger = createLogger('templates-section');
const NOOP_ADD: (template: Omit<TemplateConfig, 'id'>) => Promise<void> = async () => undefined;
const NOOP_REMOVE: (id: string) => Promise<void> = async () => undefined;
const NOOP_UPDATE: (id: string, changes: Partial<TemplateConfig>) => Promise<void> = async () =>
  undefined;

/** Props for {@link TemplateRow}. */
interface TemplateRowProps {
  /** Template to render in this row. */
  readonly template: TemplateConfig;
  /** Removes the template identified by `id`. */
  readonly onRemove: (id: string) => void;
  /** Updates one or more fields on the template identified by `id`. */
  readonly onUpdate: (id: string, changes: Partial<TemplateConfig>) => void;
}

/** Props for {@link RowHeader}. */
interface RowHeaderProps {
  /** Template the header belongs to. */
  readonly template: TemplateConfig;
  /** Removes the template identified by `id`. */
  readonly onRemove: (id: string) => void;
}

/** Renders the row heading + remove button for one template. */
function RowHeader({ template, onRemove }: RowHeaderProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm font-medium">
        {fmt({ id: 'settings.templates.name', defaultMessage: 'Name' })}
      </Label>
      <Button
        data-testid={`remove-template-${template.id}`}
        variant="destructive"
        size="sm"
        onClick={() => onRemove(template.id)}
      >
        {fmt({ id: 'settings.templates.remove', defaultMessage: 'Remove' })}
      </Button>
    </div>
  );
}

/** Props for {@link RowFields}. */
interface RowFieldsProps {
  /** Template whose fields are rendered. */
  readonly template: TemplateConfig;
  /** Updates one or more fields on the template identified by `id`. */
  readonly onUpdate: (id: string, changes: Partial<TemplateConfig>) => void;
}

/** Renders the editable name/body/noteName fields for one template. */
function RowFields({ template, onUpdate }: RowFieldsProps) {
  const fmt = useFormatMessage();
  return (
    <>
      <Input
        data-testid={`template-name-${template.id}`}
        value={template.name}
        onChange={(e) => onUpdate(template.id, { name: e.target.value })}
      />
      <Label>{fmt({ id: 'settings.templates.body', defaultMessage: 'Body template' })}</Label>
      <Textarea
        data-testid={`template-body-${template.id}`}
        value={template.bodyTemplate}
        onChange={(e) => onUpdate(template.id, { bodyTemplate: e.target.value })}
      />
      <Label>
        {fmt({ id: 'settings.templates.noteName', defaultMessage: 'Note name template' })}
      </Label>
      <Input
        data-testid={`template-noteName-${template.id}`}
        value={template.noteNameTemplate}
        onChange={(e) => onUpdate(template.id, { noteNameTemplate: e.target.value })}
      />
    </>
  );
}

/** One editable template row. */
function TemplateRow({ template, onRemove, onUpdate }: TemplateRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <RowHeader template={template} onRemove={onRemove} />
      <RowFields template={template} onUpdate={onUpdate} />
    </div>
  );
}

/** Props for {@link AddTemplateForm}. */
interface AddFormProps {
  /** Adds a new template with the supplied field values. */
  readonly onAdd: (template: Omit<TemplateConfig, 'id'>) => void;
}

/**
 * Renders the "Add new template" form. Owns its draft state so the parent
 * can stay focused on listing existing templates.
 */
function AddTemplateForm({ onAdd }: AddFormProps) {
  const fmt = useFormatMessage();
  const [name, setName] = useState('');
  const submit = (): void => {
    onAdd({
      name: name.trim(),
      frontmatterTemplate: '',
      bodyTemplate: '',
      noteNameTemplate: '',
    });
    setName('');
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        data-testid="new-template-name"
        placeholder={fmt({
          id: 'settings.templates.newPlaceholder',
          defaultMessage: 'New template name',
        })}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        data-testid="add-template"
        size="sm"
        disabled={name.trim().length === 0}
        onClick={submit}
      >
        {fmt({ id: 'settings.templates.add', defaultMessage: 'Add' })}
      </Button>
    </div>
  );
}

/** Props for {@link TemplatesList}. */
interface TemplatesListProps {
  /** Templates to render in the list. */
  readonly templates: readonly TemplateConfig[];
  /** Removes the template identified by `id`. */
  readonly handleRemove: (id: string) => void;
  /** Updates one or more fields on the template identified by `id`. */
  readonly handleUpdate: (id: string, changes: Partial<TemplateConfig>) => void;
}

/** Empty-state notice or list of editable rows. */
function TemplatesList({ templates, handleRemove, handleUpdate }: TemplatesListProps) {
  const fmt = useFormatMessage();
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {fmt({ id: 'settings.templates.empty', defaultMessage: 'No templates configured yet.' })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <TemplateRow key={t.id} template={t} onRemove={handleRemove} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}

/**
 * Settings page section that lists clip templates, lets the user edit each
 * field inline, remove a template, or add a new one. Handlers are optional
 * so the SPA shell renders without wiring before the composition root lands.
 */
export function TemplatesSection({
  templates = [],
  onAdd = NOOP_ADD,
  onRemove = NOOP_REMOVE,
  onUpdate = NOOP_UPDATE,
}: TemplatesSectionProps) {
  const fmt = useFormatMessage();
  const handleAdd = (template: Omit<TemplateConfig, 'id'>): void => {
    onAdd(template).catch((err: unknown) => logger.error('add failed', err));
  };
  const handleRemove = (id: string): void => {
    onRemove(id).catch((err: unknown) => logger.error('remove failed', err));
  };
  const handleUpdate = (id: string, changes: Partial<TemplateConfig>): void => {
    onUpdate(id, changes).catch((err: unknown) => logger.error('update failed', err));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="templates-section">
      <h2 className="text-base font-medium">
        {fmt({ id: 'settings.templates.heading', defaultMessage: 'Templates' })}
      </h2>
      <Separator />
      <TemplatesList
        templates={templates}
        handleRemove={handleRemove}
        handleUpdate={handleUpdate}
      />
      <Separator />
      <AddTemplateForm onAdd={handleAdd} />
    </div>
  );
}
