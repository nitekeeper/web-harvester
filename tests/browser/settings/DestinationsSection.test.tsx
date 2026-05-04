// tests/browser/settings/DestinationsSection.test.tsx
//
// Browser-mode tests for the settings destinations section. Asserts the
// empty-state, list rendering, remove handler, and rename interaction.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';

import { DestinationsSection } from '@presentation/settings/sections/DestinationsSection';
import type { DestinationView } from '@presentation/stores/useSettingsStore';

const NOOP_REMOVE: (id: string) => Promise<void> = async () => undefined;
const NOOP_RENAME: (id: string, label: string) => Promise<void> = async () => undefined;

const emptyProps = {
  destinations: [] as readonly DestinationView[],
  onAdd: async (): Promise<void> => undefined,
  onRemove: NOOP_REMOVE,
  onRename: NOOP_RENAME,
};

const sampleDestinations: readonly DestinationView[] = [
  {
    id: 'd1',
    label: 'Research',
    dirHandle: {} as FileSystemDirectoryHandle,
    fileNamePattern: '{title}.md',
    createdAt: 0,
  },
];

describe('DestinationsSection — rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows empty state when no destinations exist', () => {
    render(<DestinationsSection {...emptyProps} />);
    expect(screen.getByText(/no destinations/i)).toBeDefined();
  });

  it('renders a destination row with label', () => {
    render(<DestinationsSection {...emptyProps} destinations={sampleDestinations} />);
    expect(screen.getByText('Research')).toBeDefined();
  });
});

describe('DestinationsSection — interactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    let removedId: string | null = null;
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={sampleDestinations}
        onRemove={async (id) => {
          removedId = id;
        }}
      />,
    );
    await user.click(screen.getByTestId('remove-destination-d1'));
    expect(removedId).toBe('d1');
  });

  it('calls onRename when a label is edited and confirmed', async () => {
    const user = userEvent.setup();
    let renamedTo: string | null = null;
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={sampleDestinations}
        onRename={async (_id, label) => {
          renamedTo = label;
        }}
      />,
    );
    await user.click(screen.getByTestId('rename-destination-d1'));
    const input = screen.getByTestId('rename-input-d1');
    await user.clear(input);
    await user.type(input, 'Notes');
    await user.keyboard('{Enter}');
    expect(renamedTo).toBe('Notes');
  });
});
