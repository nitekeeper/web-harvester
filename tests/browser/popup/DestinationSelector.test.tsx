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
    dirHandle: {} as FileSystemDirectoryHandle,
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
    expect(screen.getByText('popup.noDestinations')).not.toBeNull();
  });

  it('renders destination labels when destinations are provided', () => {
    render(
      <DestinationSelector destinations={sampleDestinations} selectedId="d1" onSelect={NOOP} />,
    );
    expect(screen.getByText('Notes')).not.toBeNull();
  });
});
