// tests/browser/popup/ToolbarSlot.test.tsx
//
// Browser-mode tests for the ToolbarSlot component. Verifies that the slot
// renders null when no plugins have registered items, and renders the wrapper
// div when items are present.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { PluginSlotProvider, createPluginSlotRegistry } from '@presentation/hooks/usePluginSlot';
import { ToolbarSlot } from '@presentation/popup/components/ToolbarSlot';

const TOOLBAR_SLOT_SELECTOR = '[data-testid="toolbar-slot"]';
const POPUP_TOOLBAR_SLOT = 'popup-toolbar' as const;

afterEach(() => {
  cleanup();
});

describe('ToolbarSlot — empty slot', () => {
  it('renders null (no DOM node) when no plugins have registered items', () => {
    const registry = createPluginSlotRegistry();
    const { container } = render(
      <PluginSlotProvider registry={registry}>
        <ToolbarSlot />
      </PluginSlotProvider>,
    );
    expect(container.querySelector(TOOLBAR_SLOT_SELECTOR)).toBeNull();
  });

  it('renders null without a provider (default registry returns empty array)', () => {
    const { container } = render(<ToolbarSlot />);
    expect(container.querySelector(TOOLBAR_SLOT_SELECTOR)).toBeNull();
  });
});

describe('ToolbarSlot — with items', () => {
  it('renders the wrapper div when at least one plugin item is registered', () => {
    const registry = createPluginSlotRegistry();
    function DummyButton() {
      return <button data-testid="dummy-button" />;
    }
    DummyButton.displayName = 'DummyButton';
    registry.register(POPUP_TOOLBAR_SLOT, DummyButton);

    const { container } = render(
      <PluginSlotProvider registry={registry}>
        <ToolbarSlot />
      </PluginSlotProvider>,
    );
    expect(container.querySelector(TOOLBAR_SLOT_SELECTOR)).not.toBeNull();
  });

  it('renders all registered plugin components', () => {
    const registry = createPluginSlotRegistry();
    function PluginA() {
      return <span data-testid="plugin-a" />;
    }
    PluginA.displayName = 'PluginA';
    function PluginB() {
      return <span data-testid="plugin-b" />;
    }
    PluginB.displayName = 'PluginB';
    registry.register(POPUP_TOOLBAR_SLOT, PluginA);
    registry.register(POPUP_TOOLBAR_SLOT, PluginB);

    const { container } = render(
      <PluginSlotProvider registry={registry}>
        <ToolbarSlot />
      </PluginSlotProvider>,
    );
    expect(container.querySelector('[data-testid="plugin-a"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="plugin-b"]')).not.toBeNull();
  });
});
