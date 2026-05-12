// src/presentation/settings/sections/templates/FrontmatterField.tsx

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { useFormatMessage, type FormatMessageFn } from '@presentation/hooks/useFormatMessage';

import { parseFrontmatter, serializeFrontmatter } from './frontmatterUtils';
import type { FrontmatterRow } from './templateTypes';

const COLOR_SUBTLE = 'var(--wh-subtle)';
const BORDER_DEFAULT = '1px solid var(--wh-border)';

/** Props for {@link FrontmatterField}. */
export interface FrontmatterFieldProps {
  /** Serialized YAML frontmatter template string. */
  readonly value: string;
  /** Whether the field is read-only (system templates). */
  readonly readonly?: boolean;
  /** Called whenever a row is added, removed, reordered, or edited. */
  readonly onChange: (value: string) => void;
  /** Called when user clicks the Insert variable button in a value cell. */
  readonly onInsertVariable: (rowIndex: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Props for {@link FrontmatterRowItem}. */
interface RowItemProps {
  readonly row: FrontmatterRow;
  readonly index: number;
  readonly isReadonly: boolean;
  readonly fmt: FormatMessageFn;
  readonly onKeyChange: (index: number, key: string) => void;
  readonly onValueChange: (index: number, value: string) => void;
  readonly onRemove: (index: number) => void;
  readonly onInsertVariable: (index: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  readonly onDragStart: (index: number) => void;
  readonly onDragOver: (index: number) => void;
  readonly onDrop: () => void;
}

/** Shared style for inline cell inputs. */
const cellInputStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  fontSize: 12,
  fontFamily: 'var(--wh-mono)',
  color: 'var(--wh-text)',
  padding: '5px 8px',
  width: '100%',
  outline: 'none',
};

/** Shared style for icon-only action buttons. */
const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  color: COLOR_SUBTLE,
  cursor: 'pointer',
  padding: '0 4px',
};

/** Key cell for a frontmatter row. */
function KeyCell({
  index,
  value,
  isReadonly,
  onChange,
}: {
  readonly index: number;
  readonly value: string;
  readonly isReadonly: boolean;
  readonly onChange: (index: number, key: string) => void;
}) {
  return (
    <td style={{ width: '35%', borderRight: BORDER_DEFAULT }}>
      <input
        data-testid={`fm-key-${index}`}
        value={value}
        readOnly={isReadonly}
        onChange={(e) => onChange(index, e.target.value)}
        style={cellInputStyle}
      />
    </td>
  );
}

/** Insert-variable glyph button shown inside the value cell. */
function InsertVarButton({
  index,
  fmt,
  onInsert,
}: {
  readonly index: number;
  readonly fmt: FormatMessageFn;
  readonly onInsert: (i: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      data-testid={`fm-insert-var-${index}`}
      onClick={(e) => onInsert(index, e)}
      aria-label={fmt({ id: 'settings.templates.fmInsertVar', defaultMessage: 'Insert variable' })}
      style={iconBtnStyle}
    >
      {fmt({ id: 'settings.templates.fmInsertVarGlyph', defaultMessage: '{{}}' })}
    </button>
  );
}

/** Value cell with optional insert-variable button for a frontmatter row. */
function ValueCell({
  index,
  value,
  isReadonly,
  fmt,
  onChange,
  onInsertVariable,
}: {
  readonly index: number;
  readonly value: string;
  readonly isReadonly: boolean;
  readonly fmt: FormatMessageFn;
  readonly onChange: (i: number, v: string) => void;
  readonly onInsertVariable: (i: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <td>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          data-testid={`fm-value-${index}`}
          value={value}
          readOnly={isReadonly}
          onChange={(e) => onChange(index, e.target.value)}
          style={{ ...cellInputStyle, flex: 1 }}
        />
        {!isReadonly ? (
          <InsertVarButton index={index} fmt={fmt} onInsert={onInsertVariable} />
        ) : null}
      </div>
    </td>
  );
}

/** Remove button cell for a frontmatter row. */
function RemoveCell({
  index,
  isReadonly,
  fmt,
  onRemove,
}: {
  readonly index: number;
  readonly isReadonly: boolean;
  readonly fmt: FormatMessageFn;
  readonly onRemove: (index: number) => void;
}) {
  return (
    <td style={{ width: 28, paddingRight: 6 }}>
      {!isReadonly ? (
        <button
          data-testid={`fm-remove-${index}`}
          onClick={() => onRemove(index)}
          aria-label={fmt({ id: 'settings.templates.fmRemoveRow', defaultMessage: 'Remove row' })}
          style={{ ...iconBtnStyle, padding: 4, borderRadius: 4, display: 'flex' }}
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </td>
  );
}

/** Drag-handle cell shown at the start of each frontmatter row. */
function DragCell({ isReadonly }: { readonly isReadonly: boolean }) {
  return (
    <td
      style={{
        width: 20,
        paddingLeft: 8,
        color: COLOR_SUBTLE,
        cursor: isReadonly ? 'default' : 'grab',
      }}
    >
      {!isReadonly ? <GripVertical size={12} /> : null}
    </td>
  );
}

/** Single editable row in the frontmatter key/value grid. */
function FrontmatterRowItem({
  row,
  index,
  isReadonly,
  fmt,
  onKeyChange,
  onValueChange,
  onRemove,
  onInsertVariable,
  onDragStart,
  onDragOver,
  onDrop,
}: RowItemProps) {
  return (
    <tr
      draggable={!isReadonly}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={onDrop}
      style={{ borderBottom: BORDER_DEFAULT }}
    >
      <DragCell isReadonly={isReadonly} />
      <KeyCell index={index} value={row.key} isReadonly={isReadonly} onChange={onKeyChange} />
      <ValueCell
        index={index}
        value={row.value}
        isReadonly={isReadonly}
        fmt={fmt}
        onChange={onValueChange}
        onInsertVariable={onInsertVariable}
      />
      <RemoveCell index={index} isReadonly={isReadonly} fmt={fmt} onRemove={onRemove} />
    </tr>
  );
}

/** Column header row for the frontmatter table. */
function FrontmatterTableHead({
  keyLabel,
  valueLabel,
}: {
  readonly keyLabel: string;
  readonly valueLabel: string;
}) {
  const headCellStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '4px 8px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: COLOR_SUBTLE,
  };
  return (
    <thead>
      <tr style={{ borderBottom: BORDER_DEFAULT }}>
        <th style={{ width: 20 }} />
        <th style={{ ...headCellStyle, width: '35%', borderRight: BORDER_DEFAULT }}>{keyLabel}</th>
        <th style={headCellStyle}>{valueLabel}</th>
        <th style={{ width: 28 }} />
      </tr>
    </thead>
  );
}

/** State and row-mutation logic extracted from {@link FrontmatterField}. */
function useFrontmatterRows(value: string, onChange: (v: string) => void) {
  const [rows, setRows] = useState<FrontmatterRow[]>(() => parseFrontmatter(value));
  const prevValueRef = useRef(value);
  if (prevValueRef.current !== value) {
    prevValueRef.current = value;
    setRows(parseFrontmatter(value));
  }
  const commit = (next: FrontmatterRow[]): void => {
    setRows(next);
    onChange(serializeFrontmatter(next));
  };
  const handleKeyChange = (index: number, key: string): void => {
    commit(rows.map((r, i) => (i === index ? { ...r, key } : r)));
  };
  const handleValueChange = (index: number, val: string): void => {
    commit(rows.map((r, i) => (i === index ? { ...r, value: val } : r)));
  };
  const handleRemove = (index: number): void => {
    commit(rows.filter((_, i) => i !== index));
  };
  const handleAdd = (): void => {
    commit([...rows, { key: '', value: '' }]);
  };
  return { rows, commit, handleKeyChange, handleValueChange, handleRemove, handleAdd };
}

/** Drag-reorder state and handlers for the frontmatter table. */
function useFrontmatterDrag(
  rows: readonly FrontmatterRow[],
  commit: (next: FrontmatterRow[]) => void,
) {
  const dragSrcRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const handleDragStart = (index: number): void => {
    dragSrcRef.current = index;
  };
  const handleDragOver = (index: number): void => {
    dragOverRef.current = index;
  };
  const handleDrop = (): void => {
    const src = dragSrcRef.current;
    const over = dragOverRef.current;
    if (src === null || over === null || src === over) return;
    const next = [...rows];
    const spliced = next.splice(src, 1);
    const moved = spliced[0];
    if (moved === undefined) return;
    next.splice(over, 0, moved);
    dragSrcRef.current = null;
    dragOverRef.current = null;
    commit(next);
  };
  return { handleDragStart, handleDragOver, handleDrop };
}

/** Props shared by table and grid components (no onAdd). */
interface TableProps extends Omit<RowItemProps, 'row' | 'index'> {
  readonly rows: readonly FrontmatterRow[];
}

/** Props for {@link FrontmatterGrid}. */
interface FrontmatterGridProps extends TableProps {
  readonly onAdd: () => void;
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: BORDER_DEFAULT,
  borderRadius: 5,
  overflow: 'hidden',
  background: 'var(--wh-panel)',
};
const addBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'transparent',
  border: 0,
  fontSize: 11.5,
  color: 'var(--wh-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 0',
};

/** Mapped body rows for the frontmatter table. */
function TableBody(props: TableProps) {
  const { rows, ...rest } = props;
  return (
    <>
      {rows.map((row, i) => (
        // eslint-disable-next-line sonarjs/no-array-index-key -- drag-reorder commits synchronously so index is stable during typing; needed to prevent input remount on every keystroke
        <FrontmatterRowItem key={i} row={row} index={i} {...rest} />
      ))}
    </>
  );
}

/** Table of frontmatter rows (header + mapped body). */
function FrontmatterTable(props: TableProps) {
  return (
    <table style={tableStyle}>
      <FrontmatterTableHead
        keyLabel={props.fmt({ id: 'settings.templates.fmKeyCol', defaultMessage: 'Key' })}
        valueLabel={props.fmt({
          id: 'settings.templates.fmValueCol',
          defaultMessage: 'Value / Expression',
        })}
      />
      <tbody>
        <TableBody {...props} />
      </tbody>
    </table>
  );
}

/** Add-row button shown below the frontmatter table. */
function AddRowButton({
  fmt,
  onAdd,
}: {
  readonly fmt: FormatMessageFn;
  readonly onAdd: () => void;
}) {
  return (
    <button data-testid="fm-add-row" onClick={onAdd} style={addBtnStyle}>
      <Plus size={11} />
      {fmt({ id: 'settings.templates.fmAddRow', defaultMessage: 'Add Row' })}
    </button>
  );
}

/** Table + add-row button UI for the frontmatter grid. */
function FrontmatterGrid({ onAdd, isReadonly, ...rest }: FrontmatterGridProps) {
  return (
    <>
      <FrontmatterTable {...rest} isReadonly={isReadonly} />
      {!isReadonly ? <AddRowButton fmt={rest.fmt} onAdd={onAdd} /> : null}
    </>
  );
}

/**
 * Frontmatter KEY / VALUE grid. Parses `value` (YAML string) into rows on
 * mount and serializes back via `onChange` on every edit, add, remove, or
 * reorder. Drag-and-drop uses native HTML5 drag API.
 */
export function FrontmatterField({
  value,
  readonly: isReadonly = false,
  onChange,
  onInsertVariable,
}: FrontmatterFieldProps) {
  const fmt = useFormatMessage();
  const { rows, commit, handleKeyChange, handleValueChange, handleRemove, handleAdd } =
    useFrontmatterRows(value, onChange);
  const { handleDragStart, handleDragOver, handleDrop } = useFrontmatterDrag(rows, commit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--wh-muted)',
        }}
      >
        {fmt({ id: 'settings.templates.frontmatterLabel', defaultMessage: 'Frontmatter' })}
      </span>
      <FrontmatterGrid
        rows={rows}
        isReadonly={isReadonly}
        fmt={fmt}
        onKeyChange={handleKeyChange}
        onValueChange={handleValueChange}
        onRemove={handleRemove}
        onAdd={handleAdd}
        onInsertVariable={onInsertVariable}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  );
}
