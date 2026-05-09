// src/presentation/settings/sections/templates/EditorHeader.tsx

import {
  CheckCircle,
  Copy,
  Download,
  Loader,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import type { FormatMessageFn } from '@presentation/hooks/useFormatMessage';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import type { TemplateView } from './templateTypes';
import type { AutosaveStatus } from './useAutosave';

/** Props for {@link EditorHeader}. */
export interface EditorHeaderProps {
  /** Template currently open in the editor. */
  readonly template: TemplateView;
  /** Current autosave lifecycle status. */
  readonly autosaveStatus: AutosaveStatus;
  /** Whether the live preview is currently shown. */
  readonly previewOn: boolean;
  /** Called when the name input value changes (user templates only). */
  readonly onNameChange: (name: string) => void;
  /** Called when the preview toggle is clicked. */
  readonly onPreviewToggle: () => void;
  /** Called when Duplicate is selected from the action menu. */
  readonly onDuplicate: () => void;
  /** Called when Export JSON is selected from the action menu. */
  readonly onExport: () => void;
  /** Called when Delete is selected (user templates only). */
  readonly onDelete: () => void;
}

/** CSS color token for muted text. */
const colorMuted = 'var(--wh-muted)';

/** CSS value for a standard panel border. */
const borderPanel = '1px solid var(--wh-border)';

/** Shared inline flex row style for autosave status spans. */
const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11.5,
};

/** Style for the editable template name input. */
const nameInputStyle: React.CSSProperties = {
  flex: 1,
  border: 0,
  background: 'transparent',
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--wh-text)',
  outline: 'none',
  minWidth: 0,
};

/** Style for the preview toggle button. */
const previewBtnBaseStyle: React.CSSProperties = {
  background: 'transparent',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11.5,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

/** Style for the ⋯ trigger button. */
const menuTriggerBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  background: 'transparent',
  border: 0,
  borderRadius: 5,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: colorMuted,
};

/** Base style for each action menu button row. */
const menuItemBaseStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 0,
  padding: '5px 8px',
  borderRadius: 4,
  fontSize: 11.5,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** Renders the Saving… / Saved / Save failed indicator. */
function AutosaveIndicator({ status }: { readonly status: AutosaveStatus }) {
  const fmt = useFormatMessage();
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span style={{ ...statusRowStyle, color: colorMuted }} aria-live="polite">
        <Loader size={12} style={{ animation: 'wh-spin 0.9s linear infinite' }} />
        {fmt({ id: 'settings.templates.saving', defaultMessage: 'Saving…' })}
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span style={{ ...statusRowStyle, color: 'var(--wh-success)' }} aria-live="polite">
        <CheckCircle size={12} />
        {fmt({ id: 'settings.templates.saved', defaultMessage: 'Saved' })}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11.5, color: 'var(--wh-danger)' }} aria-live="assertive">
      {fmt({ id: 'settings.templates.saveError', defaultMessage: 'Save failed — retry' })}
    </span>
  );
}

/** An entry in the action dropdown menu. */
interface ActionItem {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly action: () => void;
  readonly danger: boolean;
}

/** Props for {@link ActionMenuPanel}. */
interface ActionMenuPanelProps {
  readonly items: ActionItem[];
}

/** Dropdown panel rendering a list of action buttons. */
function ActionMenuPanel({ items }: ActionMenuPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 30,
        zIndex: 100,
        background: 'var(--wh-panel)',
        border: borderPanel,
        borderRadius: 6,
        padding: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        minWidth: 160,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          style={{
            ...menuItemBaseStyle,
            color: item.danger ? 'var(--wh-danger)' : 'var(--wh-text)',
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Props for {@link ActionMenuTrigger}. */
interface ActionMenuTriggerProps {
  readonly isSystem: boolean;
  readonly fmt: FormatMessageFn;
  readonly onDuplicate: () => void;
  readonly onExport: () => void;
  readonly onDelete: () => void;
}

/** Builds the ordered action item list for the ⋯ dropdown. */
function buildActionItems(props: ActionMenuTriggerProps, close: () => void): ActionItem[] {
  const { isSystem, fmt, onDuplicate, onExport, onDelete } = props;
  const wrap = (fn: () => void) => () => {
    fn();
    close();
  };
  const items: ActionItem[] = [
    {
      label: fmt({ id: 'settings.templates.duplicate', defaultMessage: 'Duplicate' }),
      icon: <Copy size={12} />,
      action: wrap(onDuplicate),
      danger: false,
    },
    {
      label: fmt({ id: 'settings.templates.export', defaultMessage: 'Export JSON' }),
      icon: <Download size={12} />,
      action: wrap(onExport),
      danger: false,
    },
  ];
  if (isSystem) {
    items.push({
      label: fmt({ id: 'settings.templates.reset', defaultMessage: 'Reset to default' }),
      icon: <RotateCcw size={12} />,
      action: close,
      danger: false,
    });
  } else {
    items.push({
      label: fmt({ id: 'settings.templates.delete', defaultMessage: 'Delete' }),
      icon: <Trash2 size={12} />,
      action: wrap(onDelete),
      danger: true,
    });
  }
  return items;
}

/** ⋯ button with its controlled dropdown panel. */
function ActionMenuTrigger(props: ActionMenuTriggerProps) {
  const { fmt } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  const items = buildActionItems(props, close);
  return (
    <div style={{ position: 'relative' }}>
      <button
        data-testid="editor-menu-btn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={fmt({
          id: 'settings.templates.actionsMenu',
          defaultMessage: 'Template actions',
        })}
        style={menuTriggerBtnStyle}
      >
        <MoreHorizontal size={14} />
      </button>
      {menuOpen ? (
        <>
          <button
            aria-label={fmt({ id: 'settings.templates.closeMenu', defaultMessage: 'Close menu' })}
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
              background: 'transparent',
              border: 0,
              cursor: 'default',
            }}
          />
          <ActionMenuPanel items={items} />
        </>
      ) : null}
    </div>
  );
}

/** Outer wrapper style for the header strip. */
const headerWrapStyle: React.CSSProperties = {
  padding: '14px 22px',
  borderBottom: borderPanel,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

/** Props for {@link PreviewToggleBtn}. */
interface PreviewToggleBtnProps {
  readonly previewOn: boolean;
  readonly fmt: FormatMessageFn;
  readonly onPreviewToggle: () => void;
}

/** Preview on/off toggle button. */
function PreviewToggleBtn({ previewOn, fmt, onPreviewToggle }: PreviewToggleBtnProps) {
  return (
    <button
      data-testid="preview-toggle"
      onClick={onPreviewToggle}
      aria-label={fmt({
        id: 'settings.templates.previewToggle',
        defaultMessage: previewOn ? 'Hide preview' : 'Show preview',
      })}
      style={{
        ...previewBtnBaseStyle,
        border: borderPanel,
        color: previewOn ? 'var(--wh-accent)' : colorMuted,
      }}
    >
      {previewOn
        ? fmt({ id: 'settings.templates.previewOn', defaultMessage: '✓ Preview' })
        : fmt({ id: 'settings.templates.previewOff', defaultMessage: 'Preview' })}
    </button>
  );
}

/** Props for {@link EditorNameRow}. */
interface EditorNameRowProps {
  readonly template: TemplateView;
  readonly autosaveStatus: AutosaveStatus;
  readonly onNameChange: (name: string) => void;
}

/** Lock icon + name input + autosave indicator group. */
function EditorNameRow({ template, autosaveStatus, onNameChange }: EditorNameRowProps) {
  const fmt = useFormatMessage();
  return (
    <>
      {template.isSystem ? (
        <Lock size={12} style={{ color: 'var(--wh-subtle)', flexShrink: 0 }} />
      ) : null}
      <input
        data-testid="editor-name-input"
        value={template.name}
        readOnly={template.isSystem}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label={fmt({ id: 'settings.templates.nameLabel', defaultMessage: 'Template name' })}
        style={nameInputStyle}
      />
      <AutosaveIndicator status={autosaveStatus} />
    </>
  );
}

/**
 * Header strip for the template editor pane. Contains the editable template
 * name, autosave status indicator, preview toggle, and the ⋯ action menu.
 */
export function EditorHeader({
  template,
  autosaveStatus,
  previewOn,
  onNameChange,
  onPreviewToggle,
  onDuplicate,
  onExport,
  onDelete,
}: EditorHeaderProps) {
  const fmt = useFormatMessage();
  return (
    <div style={headerWrapStyle}>
      <EditorNameRow
        template={template}
        autosaveStatus={autosaveStatus}
        onNameChange={onNameChange}
      />
      <PreviewToggleBtn previewOn={previewOn} fmt={fmt} onPreviewToggle={onPreviewToggle} />
      <ActionMenuTrigger
        isSystem={template.isSystem}
        fmt={fmt}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
    </div>
  );
}
