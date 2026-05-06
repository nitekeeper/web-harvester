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
  it('renders the toolbar slot', () => {
    render(<Popup onSave={() => undefined} onSettings={() => undefined} />);
    expect(document.querySelector('[data-testid="toolbar-slot"]')).not.toBeNull();
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
    for (const labelText of ['DESTINATION', 'TEMPLATE', 'PREVIEW']) {
      const span = screen.getByText(labelText);
      expect(span.id).toBeTruthy();
      const group = span.closest('[role="group"]');
      expect(group).not.toBeNull();
      expect(group?.getAttribute('aria-labelledby')).toBe(span.id);
    }
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
});
