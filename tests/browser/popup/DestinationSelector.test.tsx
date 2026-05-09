// tests/browser/popup/DestinationSelector.test.tsx
//
// Browser-mode tests for the popup destination selector. Asserts both the
// empty-state fallback and the populated dropdown rendering.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { DestinationSelector } from '@presentation/popup/components/DestinationSelector';
import type { DestinationView } from '@presentation/stores/useSettingsStore';

const NOOP = (): void => undefined;

const sampleDestinations: readonly DestinationView[] = [
  {
    id: 'd1',
    label: 'Notes',
    dirHandle: { name: 'Obsidian Vault' } as FileSystemDirectoryHandle,
    fileNamePattern: '{title}.md',
    createdAt: 0,
  },
];

describe('DestinationSelector', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the empty-state notice when the destinations list is empty', () => {
    render(<DestinationSelector destinations={[]} selectedId={null} onSelect={NOOP} />);
    expect(screen.getByText('No destinations configured')).not.toBeNull();
  });

  it('renders destination labels when destinations are provided', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId="d1" onSelect={NOOP} />,
    );
    expect(screen.getByText('Notes')).not.toBeNull();
  });

  it('does not show the dirHandle.name path hint when a destination is selected', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId="d1" onSelect={NOOP} />,
    );
    expect(document.querySelector('[data-testid="destination-path-hint"]')).toBeNull();
  });

  it('does not show a path hint when no destination is selected', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId={null} onSelect={NOOP} />,
    );
    expect(document.querySelector('[data-testid="destination-path-hint"]')).toBeNull();
  });
});

describe('DestinationSelector — trigger appearance', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the trigger without justify-between so the selected value is left-aligned', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId="d1" onSelect={NOOP} />,
    );
    const trigger = screen.getByTestId('destination-selector');
    expect(trigger.classList.contains('justify-between')).toBe(false);
  });

  it('renders the trigger with rounded-xs for the small-input-shell radius', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId="d1" onSelect={NOOP} />,
    );
    const trigger = screen.getByTestId('destination-selector');
    expect(trigger.classList.contains('rounded-xs')).toBe(true);
  });
});
