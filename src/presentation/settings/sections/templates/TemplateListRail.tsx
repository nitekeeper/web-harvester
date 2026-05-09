// src/presentation/settings/sections/templates/TemplateListRail.tsx

import { FileText } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import type { TemplateView } from './templateTypes';

/** Props for {@link TemplateListRail}. */
export interface TemplateListRailProps {
  /** All templates (system + user, pre-sorted). */
  readonly templates: readonly TemplateView[];
  /** Currently selected template id, or `null` if none. */
  readonly selectedId: string | null;
  /** Called when the user clicks a row. */
  readonly onSelect: (id: string) => void;
  /** Called when the user clicks "+ New". */
  readonly onNew: () => void;
}

const FILTER_MIN = 4;
const SYSTEM_BADGE_ID = 'settings.templates.systemBadge';
const SYSTEM_BADGE_DEFAULT = 'system';
const BORDER = '1px solid var(--wh-border)';

/** Props for {@link SystemBadge}. */
interface SystemBadgeProps {
  readonly label: string;
}

/** Small pill badge rendered next to system template names. */
function SystemBadge({ label }: SystemBadgeProps) {
  return (
    <span
      style={{
        fontSize: 8.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--wh-subtle)',
        background: 'var(--wh-border)',
        borderRadius: 999,
        padding: '1px 5px',
      }}
    >
      {label}
    </span>
  );
}

/** Props for {@link TemplateRowItem}. */
interface RowProps {
  readonly template: TemplateView;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
  readonly systemBadgeLabel: string;
}

/** Single row in the list rail. */
function TemplateRowItem({ template, isSelected, onSelect, systemBadgeLabel }: RowProps) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      data-testid={`template-row-${template.id}`}
      onClick={() => onSelect(template.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected ? 'var(--wh-hover)' : 'transparent',
        border: 0,
        padding: '7px 8px',
        borderRadius: 5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      <FileText
        size={13}
        style={{
          color: isSelected ? 'var(--wh-accent)' : 'var(--wh-muted)',
          marginTop: 1,
          flexShrink: 0,
        }}
      />
      <RowLabel template={template} isSelected={isSelected} systemBadgeLabel={systemBadgeLabel} />
    </button>
  );
}

/** Props for {@link RowLabel}. */
interface RowLabelProps {
  readonly template: TemplateView;
  readonly isSelected: boolean;
  readonly systemBadgeLabel: string;
}

/** Name and optional system badge inside a template row. */
function RowLabel({ template, isSelected, systemBadgeLabel }: RowLabelProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: isSelected ? 600 : 400,
          color: 'var(--wh-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {template.name}
        {template.isSystem ? <SystemBadge label={systemBadgeLabel} /> : null}
      </div>
    </div>
  );
}

/** Props for {@link RailHeader}. */
interface RailHeaderProps {
  readonly headingLabel: string;
  readonly newLabel: string;
  readonly newAriaLabel: string;
  readonly onNew: () => void;
}

/** Props for {@link NewButton}. */
interface NewButtonProps {
  readonly label: string;
  readonly ariaLabel: string;
  readonly onNew: () => void;
}

/** "+ New" action button rendered in the rail header. */
function NewButton({ label, ariaLabel, onNew }: NewButtonProps) {
  return (
    <button
      data-testid="template-new-btn"
      onClick={onNew}
      aria-label={ariaLabel}
      style={{
        background: 'transparent',
        border: 0,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--wh-accent)',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: 4,
      }}
    >
      {label}
    </button>
  );
}

/** Header row of the list rail containing the section title and the "+ New" button. */
function RailHeader({ headingLabel, newLabel, newAriaLabel, onNew }: RailHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 8px 6px',
        borderBottom: BORDER,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--wh-muted)',
        }}
      >
        {headingLabel}
      </span>
      <NewButton label={newLabel} ariaLabel={newAriaLabel} onNew={onNew} />
    </div>
  );
}

/** Props for {@link FilterInput}. */
interface FilterInputProps {
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

/** Search/filter input shown above the template list when ≥4 templates exist. */
function FilterInput({ value, placeholder, onChange }: FilterInputProps) {
  return (
    <div style={{ padding: '6px 8px', borderBottom: BORDER }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 28,
          background: 'var(--wh-bg)',
          border: BORDER,
          borderRadius: 5,
          padding: '0 8px',
          fontSize: 11.5,
          fontFamily: 'var(--wh-mono)',
          color: 'var(--wh-text)',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/** Props for {@link TemplateList}. */
interface TemplateListProps {
  readonly visible: readonly TemplateView[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly systemBadgeLabel: string;
}

/** Scrollable list of template rows. */
function TemplateList({ visible, selectedId, onSelect, systemBadgeLabel }: TemplateListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
      {visible.map((t) => (
        <TemplateRowItem
          key={t.id}
          template={t}
          isSelected={t.id === selectedId}
          onSelect={onSelect}
          systemBadgeLabel={systemBadgeLabel}
        />
      ))}
    </div>
  );
}

/** Props for {@link RailBody}. */
interface RailBodyProps {
  readonly visible: readonly TemplateView[];
  readonly selectedId: string | null;
  readonly showFilter: boolean;
  readonly filter: string;
  readonly filterPlaceholder: string;
  readonly systemBadgeLabel: string;
  readonly onSelect: (id: string) => void;
  readonly onFilterChange: (value: string) => void;
}

/** Renders the filter input (when visible) and the template list. */
function RailBody({
  visible,
  selectedId,
  showFilter,
  filter,
  filterPlaceholder,
  systemBadgeLabel,
  onSelect,
  onFilterChange,
}: RailBodyProps) {
  return (
    <>
      {showFilter ? (
        <FilterInput value={filter} placeholder={filterPlaceholder} onChange={onFilterChange} />
      ) : null}
      <TemplateList
        visible={visible}
        selectedId={selectedId}
        onSelect={onSelect}
        systemBadgeLabel={systemBadgeLabel}
      />
    </>
  );
}

const RAIL_STYLE: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: BORDER,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

/**
 * Left-rail component for the Templates split-pane. Shows a sorted list of
 * templates, an optional filter input (auto-shown when ≥4 templates), and a
 * "+ New" button for creating user templates.
 */
export function TemplateListRail({
  templates,
  selectedId,
  onSelect,
  onNew,
}: TemplateListRailProps) {
  const fmt = useFormatMessage();
  const [filter, setFilter] = useState('');
  const systemBadgeLabel = fmt({ id: SYSTEM_BADGE_ID, defaultMessage: SYSTEM_BADGE_DEFAULT });
  const visible = filter.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : templates;
  return (
    <div
      role="listbox"
      aria-label={fmt({ id: 'settings.templates.listLabel', defaultMessage: 'Templates' })}
      style={RAIL_STYLE}
    >
      <RailHeader
        headingLabel={fmt({ id: 'settings.templates.railLabel', defaultMessage: 'Templates' })}
        newLabel={fmt({ id: 'settings.templates.newButtonText', defaultMessage: '+ New' })}
        newAriaLabel={fmt({ id: 'settings.templates.newLabel', defaultMessage: 'New template' })}
        onNew={onNew}
      />
      <RailBody
        visible={visible}
        selectedId={selectedId}
        showFilter={templates.length >= FILTER_MIN}
        filter={filter}
        filterPlaceholder={fmt({
          id: 'settings.templates.filter',
          defaultMessage: 'Filter templates…',
        })}
        systemBadgeLabel={systemBadgeLabel}
        onSelect={onSelect}
        onFilterChange={setFilter}
      />
    </div>
  );
}
