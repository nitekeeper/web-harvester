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
    render(<Popup />);
    expect(document.querySelector('[data-testid="toolbar-slot"]')).not.toBeNull();
  });

  it('renders the destination selector', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="destination-selector"]')).not.toBeNull();
  });

  it('renders the template selector', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="template-selector"]')).not.toBeNull();
  });

  it('renders the save button', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('renders the popup header', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="popup-header"]')).not.toBeNull();
  });

  it('renders the action footer clip button', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('renders the status bar', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="status-bar"]')).not.toBeNull();
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
    render(<Popup />);
    await userEvent.setup().click(screen.getByTestId('template-selector'));
    expect(screen.getByText('Article')).not.toBeNull();
  });
});
