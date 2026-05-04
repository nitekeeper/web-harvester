// tests/browser/popup/Popup.test.tsx
//
// Browser-mode smoke tests for the popup root component. Run via @vitest/browser
// against real Chromium so Radix portals and computed layout values behave the
// same way they do in the production extension.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Popup } from '@presentation/popup/Popup';

describe('Popup', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('renders the picker toggle', () => {
    render(<Popup />);
    expect(document.querySelector('[data-testid="picker-toggle"]')).not.toBeNull();
  });
});
