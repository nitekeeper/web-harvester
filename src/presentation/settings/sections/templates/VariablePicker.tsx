// src/presentation/settings/sections/templates/VariablePicker.tsx

import type React from 'react';
import { useRef, useState } from 'react';

import { useFormatMessage, type FormatMessageFn } from '@presentation/hooks/useFormatMessage';

/** A variable entry shown in the picker. */
interface VariableEntry {
  readonly variable: string;
  readonly description: string;
}

/** Named group of variable entries. */
interface VariableGroup {
  readonly label: string;
  readonly entries: readonly VariableEntry[];
}

const VARIABLE_GROUPS: readonly VariableGroup[] = [
  {
    label: 'Page',
    entries: [
      { variable: '{{page.title}}', description: 'Page title' },
      { variable: '{{page.url}}', description: 'Full URL' },
      { variable: '{{page.domain}}', description: 'Domain name' },
      { variable: '{{content}}', description: 'Page content (raw HTML)' },
      { variable: '{{page.published_date}}', description: 'Published date' },
      { variable: '{{page.reading_time}}', description: 'Estimated read time' },
      { variable: '{{meta.author}}', description: 'Author from meta tags' },
    ],
  },
  {
    label: 'Meta',
    entries: [
      { variable: '{{page.tags}}', description: 'Tags array' },
      { variable: '{{meta.description}}', description: 'Meta description' },
      { variable: '{{meta.image}}', description: 'Open Graph image URL' },
      { variable: '{{meta.site_name}}', description: 'Open Graph site name' },
    ],
  },
  {
    label: 'Date / Now',
    entries: [
      { variable: '{{now}}', description: 'Current date/time' },
      { variable: '{{today}}', description: 'Today (YYYY-MM-DD)' },
      { variable: '{{today_iso}}', description: 'Today in ISO 8601' },
    ],
  },
  {
    label: 'Filters',
    entries: [
      { variable: '| date("YYYY-MM-DD")', description: 'Format a date value' },
      { variable: '| safe_name', description: 'Lowercase, spaces → hyphens, no special chars' },
      { variable: '| slugify', description: 'URL-safe slug' },
      { variable: '| truncate(100)', description: 'Truncate to N characters' },
      { variable: '| markdown', description: 'Render as Markdown' },
      { variable: '| default("fallback")', description: 'Fallback when value is empty' },
    ],
  },
  {
    label: 'Dynamic',
    entries: [
      {
        variable: '{{selector:.byline}}',
        description: 'Text of matching CSS element (click "Pick element" to generate)',
      },
      {
        variable: '{{selectorHtml:.card}}',
        description: 'Outer HTML of matching CSS element',
      },
      {
        variable: '{{selector:img?src}}',
        description: 'Attribute value from matching element',
      },
      {
        variable: '{{schema:@Article:author}}',
        description: 'Schema.org / JSON-LD field',
      },
      {
        variable: '{{meta:name:keywords}}',
        description: 'Any <meta name="…"> tag value',
      },
      {
        variable: '{{meta:property:og:image}}',
        description: 'Any <meta property="…"> tag value',
      },
    ],
  },
];

const WH_BORDER = 'var(--wh-border)';
const POPOVER_WIDTH = 280;

/**
 * Computes a `position: fixed` style that places the 280px wide popover just
 * below `anchorRect`. Clamps left so the popover never overflows the viewport.
 */
export function computePopoverPosition(
  anchorRect: DOMRect,
  viewportWidth: number,
): React.CSSProperties {
  const left = Math.min(anchorRect.left, viewportWidth - POPOVER_WIDTH - 4);
  return {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: Math.max(0, left),
  };
}

/** Filters groups by a lowercase search query; empty query returns all. */
function filterGroups(query: string): readonly VariableGroup[] {
  if (!query.trim()) return VARIABLE_GROUPS;
  const lower = query.toLowerCase();
  return VARIABLE_GROUPS.map((group) => ({
    ...group,
    entries: group.entries.filter(
      (e) =>
        e.variable.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower),
    ),
  })).filter((g) => g.entries.length > 0);
}

/** Props for {@link VariableEntryButton}. */
interface VariableEntryButtonProps {
  readonly entry: VariableEntry;
  readonly onSelect: (variable: string) => void;
}

/** Single clickable entry inside the picker list. */
function VariableEntryButton({ entry, onSelect }: VariableEntryButtonProps) {
  return (
    <button
      role="option"
      aria-selected={false}
      onClick={() => {
        onSelect(entry.variable);
      }}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 0,
        padding: '4px 10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--wh-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: 11.5, fontFamily: 'var(--wh-mono)', color: 'var(--wh-text)' }}>
        {entry.variable}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--wh-subtle)' }}>{entry.description}</span>
    </button>
  );
}

/** Props for {@link VariableGroupSection}. */
interface VariableGroupSectionProps {
  readonly group: VariableGroup;
  readonly onSelect: (variable: string) => void;
}

/** Renders a labelled group of variable entries. */
function VariableGroupSection({ group, onSelect }: VariableGroupSectionProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--wh-subtle)',
          padding: '6px 10px 2px',
        }}
      >
        {group.label}
      </div>
      {group.entries.map((entry) => (
        <VariableEntryButton key={entry.variable} entry={entry} onSelect={onSelect} />
      ))}
    </div>
  );
}

/** Props for {@link SearchInput}. */
interface SearchInputProps {
  readonly fmt: FormatMessageFn;
  readonly value: string;
  readonly onChange: (q: string) => void;
}

/** Autofocused search input rendered at the top of the picker. */
function SearchInput({ fmt, value, onChange }: SearchInputProps) {
  return (
    <div style={{ padding: '6px 8px', borderBottom: `1px solid ${WH_BORDER}` }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fmt({
          id: 'settings.templates.vpSearch',
          defaultMessage: 'Search variables…',
        })}
        style={{
          width: '100%',
          background: 'var(--wh-bg)',
          border: `1px solid ${WH_BORDER}`,
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 11.5,
          color: 'var(--wh-text)',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/** Props for {@link PickerPopover}. */
interface PickerPopoverProps {
  readonly fmt: FormatMessageFn;
  readonly query: string;
  readonly onQueryChange: (q: string) => void;
  readonly filteredGroups: readonly VariableGroup[];
  readonly onSelect: (variable: string) => void;
  readonly onClose: () => void;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly anchorRect?: DOMRect;
}

const POPOVER_BASE_STYLE: React.CSSProperties = {
  zIndex: 1000,
  width: POPOVER_WIDTH,
  maxHeight: 360,
  background: 'var(--wh-panel)',
  border: `1px solid ${WH_BORDER}`,
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,.15)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

/** The popover panel containing the search input and grouped variable list. */
function PickerPopover({
  fmt,
  query,
  onQueryChange,
  filteredGroups,
  onSelect,
  onClose,
  containerRef,
  anchorRect,
}: PickerPopoverProps) {
  const ariaLabel = fmt({
    id: 'settings.templates.variablePicker',
    defaultMessage: 'Variable picker',
  });
  const positionStyle = anchorRect
    ? computePopoverPosition(anchorRect, window.innerWidth)
    : { position: 'absolute' as const, top: 0, left: 0 };
  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      style={{ ...POPOVER_BASE_STYLE, ...positionStyle }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <SearchInput fmt={fmt} value={query} onChange={onQueryChange} />
      <div className="wh-scroll" style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {filteredGroups.map((group) => (
          <VariableGroupSection key={group.label} group={group} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/** Props for {@link VariablePicker}. */
export interface VariablePickerProps {
  /** Whether the picker popover is visible. */
  readonly open: boolean;
  /** Called when a variable is selected; the caller inserts it. */
  readonly onInsert: (variable: string) => void;
  /** Called when the picker should close. */
  readonly onClose: () => void;
  /** Bounding rect of the trigger button; used to anchor the popover. */
  readonly anchorRect?: DOMRect;
}

/**
 * Variable picker popover. Renders a search input and a grouped list of
 * template variables. Calls `onInsert(variable)` when the user clicks an
 * entry — the caller is responsible for inserting at the cursor position.
 * Closes on Escape or outside click.
 */
export function VariablePicker({ open, onInsert, onClose, anchorRect }: VariablePickerProps) {
  const fmt = useFormatMessage();
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handleSelect = (variable: string) => {
    onInsert(variable);
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
      />
      <PickerPopover
        fmt={fmt}
        query={query}
        onQueryChange={setQuery}
        filteredGroups={filterGroups(query)}
        onSelect={handleSelect}
        onClose={onClose}
        containerRef={containerRef}
        anchorRect={anchorRect}
      />
    </>
  );
}
