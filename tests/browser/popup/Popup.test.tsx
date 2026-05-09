// tests/browser/popup/Popup.test.tsx
//
// Browser-mode smoke tests for the popup root component. Run via @vitest/browser
// against real Chromium so Radix portals and computed layout values behave the
// same way they do in the production extension.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { Popup } from '@presentation/popup/Popup';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

beforeEach(() => {
  usePopupStore.setState({ isPickerActive: false, selectedTemplateId: null });
  useSettingsStore.setState({ templates: [], destinations: [] });
});

afterEach(() => {
  cleanup();
});

describe('Popup — structure', () => {
  it('does not render the toolbar slot when no plugins are registered', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="toolbar-slot"]')).toBeNull();
  });

  it('renders the destination selector', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="destination-selector"]')).not.toBeNull();
  });

  it('renders the template selector', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="template-selector"]')).not.toBeNull();
  });

  it('renders the popup header', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="popup-header"]')).not.toBeNull();
  });

  it('renders the action footer clip button', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('renders the status bar', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="status-bar"]')).not.toBeNull();
  });

  it('renders the DESTINATION field label', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('DESTINATION')).not.toBeNull();
  });

  it('renders the TEMPLATE field label', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('TEMPLATE')).not.toBeNull();
  });

  it('renders the PREVIEW field label', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('PREVIEW')).not.toBeNull();
  });
});

describe('Popup — accessibility', () => {
  it('field groups expose aria-labelledby pointing to their label span', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    for (const labelText of ['DESTINATION', 'TEMPLATE', 'PROPERTIES', 'PREVIEW']) {
      const span = screen.getByText(labelText);
      expect(span.id).toBeTruthy();
      const group = span.closest('[role="group"]');
      expect(group).not.toBeNull();
      expect(group?.getAttribute('aria-labelledby')).toBe(span.id);
    }
  });

  it('properties toggle button has aria-controls pointing to the section body', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    const btn = document.querySelector('[data-testid="properties-toggle"]');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-controls')).toBe('properties-section-body');
    const body = document.getElementById('properties-section-body');
    expect(body).not.toBeNull();
  });
});

describe('Popup — interactions', () => {
  it('shows available templates in the dropdown when the store has templates', async () => {
    useSettingsStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Article',
          frontmatterTemplate: '',
          bodyTemplate: '',
          noteNameTemplate: '',
        },
      ],
    });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    await userEvent.setup().click(screen.getByTestId('template-selector'));
    expect(screen.getByText('Article')).not.toBeNull();
  });

  it('renders select dropdown content inside the popup container, not portaled to document.body', async () => {
    useSettingsStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Article',
          frontmatterTemplate: '',
          bodyTemplate: '',
          noteNameTemplate: '',
        },
      ],
    });
    const { container } = render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    await userEvent.setup().click(screen.getByTestId('template-selector'));
    // Without Portal, SelectContent renders inside the component tree (container).
    // With Portal (the broken state), it renders at document.body and container query returns null.
    expect(container.querySelector('[data-slot="select-content"]')).not.toBeNull();
  });
});

describe('Popup — properties section', () => {
  afterEach(() => {
    cleanup();
    usePopupStore.setState({ previewMarkdown: '' });
  });

  it('renders the PROPERTIES label even when previewMarkdown is empty', () => {
    usePopupStore.setState({ previewMarkdown: '' });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('PROPERTIES')).not.toBeNull();
  });

  it('renders the properties editor when previewMarkdown has frontmatter', () => {
    usePopupStore.setState({
      previewMarkdown: '---\ntitle: My Page\nauthor: Jane\n---\n\n# Body',
    });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="properties-editor"]')).not.toBeNull();
  });

  it('renders the properties empty state when previewMarkdown has no frontmatter', () => {
    usePopupStore.setState({ previewMarkdown: '# No frontmatter\n\nBody.' });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="properties-editor"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="properties-empty"]')).not.toBeNull();
  });
});

const TOGGLE_SELECTOR = '[data-testid="properties-toggle"]';
const BODY_SELECTOR = '[data-testid="properties-body"]';
const CHEVRON_SELECTOR = '[data-testid="properties-chevron"]';
const TOGGLE_NOT_FOUND = 'properties-toggle not found';

describe('Popup — collapsible properties header (static)', () => {
  afterEach(() => {
    cleanup();
    usePopupStore.setState({ previewMarkdown: '' });
  });

  it('renders the properties header as a button element', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    const btn = document.querySelector(TOGGLE_SELECTOR);
    expect(btn).not.toBeNull();
    expect(btn?.tagName.toLowerCase()).toBe('button');
  });

  it('shows the chevron icon in the properties header button', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector(CHEVRON_SELECTOR)).not.toBeNull();
  });

  it('shows "0 fields" badge when previewMarkdown has no frontmatter', () => {
    usePopupStore.setState({ previewMarkdown: '' });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('0 fields')).not.toBeNull();
  });

  it('shows "N fields" badge matching the number of frontmatter fields', () => {
    usePopupStore.setState({
      previewMarkdown: '---\ntitle: My Page\nauthor: Jane\ntags: foo\n---\n\n# Body',
    });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('3 fields')).not.toBeNull();
  });

  it('shows "1 fields" badge for a single frontmatter field', () => {
    usePopupStore.setState({ previewMarkdown: '---\ntitle: Hello\n---\n' });
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(screen.getByText('1 fields')).not.toBeNull();
  });

  it('section body is visible by default (expanded)', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector(BODY_SELECTOR)).not.toBeNull();
  });
});

describe('Popup — collapsible properties header (interactions)', () => {
  afterEach(() => {
    cleanup();
    usePopupStore.setState({ previewMarkdown: '' });
  });

  it('collapses the section body when the header button is clicked', async () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    const btn = document.querySelector(TOGGLE_SELECTOR);
    if (!btn) throw new Error(TOGGLE_NOT_FOUND);
    await userEvent.setup().click(btn);
    expect(document.querySelector(BODY_SELECTOR)).toBeNull();
  });

  it('re-expands the section body when the header button is clicked again', async () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    const user = userEvent.setup();
    const btn = document.querySelector(TOGGLE_SELECTOR);
    if (!btn) throw new Error(TOGGLE_NOT_FOUND);
    await user.click(btn);
    expect(document.querySelector(BODY_SELECTOR)).toBeNull();
    await user.click(btn);
    expect(document.querySelector(BODY_SELECTOR)).not.toBeNull();
  });

  it('rotates the chevron 180deg when collapsed', async () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    const btn = document.querySelector(TOGGLE_SELECTOR);
    if (!btn) throw new Error(TOGGLE_NOT_FOUND);
    expect(document.querySelector(CHEVRON_SELECTOR)?.classList.contains('rotate-180')).toBe(false);
    await userEvent.setup().click(btn);
    expect(document.querySelector(CHEVRON_SELECTOR)?.classList.contains('rotate-180')).toBe(true);
  });
});
