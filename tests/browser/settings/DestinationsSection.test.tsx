// tests/browser/settings/DestinationsSection.test.tsx
//
// Browser-mode tests for the redesigned DestinationsSection.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DestinationsSection } from '@presentation/settings/sections/DestinationsSection';
import type { DestinationView } from '@presentation/stores/useSettingsStore';

const NOOP_ADD: () => Promise<void> = async () => undefined;
const NOOP_REMOVE: (id: string) => Promise<void> = async () => undefined;
const NOOP_SET_PRIMARY: (id: string) => Promise<void> = async () => undefined;

function makeDestination(overrides: Partial<DestinationView> = {}): DestinationView {
  return {
    id: 'd1',
    label: 'Research',
    dirHandle: {} as FileSystemDirectoryHandle,
    fileNamePattern: '{title}.md',
    createdAt: 0,
    ...overrides,
  };
}

const emptyProps = {
  destinations: [] as readonly DestinationView[],
  primaryId: null,
  onAdd: NOOP_ADD,
  onRemove: NOOP_REMOVE,
  onSetPrimary: NOOP_SET_PRIMARY,
};

afterEach(() => {
  cleanup();
});

describe('DestinationsSection — header', () => {
  it('renders the section heading', () => {
    render(<DestinationsSection {...emptyProps} />);
    expect(screen.getByText('Destinations')).toBeDefined();
  });

  it('renders the subtitle', () => {
    render(<DestinationsSection {...emptyProps} />);
    expect(screen.getByText(/local folders/i)).toBeDefined();
  });

  it('renders the add destination button', () => {
    render(<DestinationsSection {...emptyProps} />);
    expect(screen.getByTestId('add-destination')).toBeDefined();
  });
});

describe('DestinationsSection — empty state', () => {
  it('shows the empty notice when no destinations exist', () => {
    render(<DestinationsSection {...emptyProps} />);
    expect(screen.getByText(/no destinations/i)).toBeDefined();
  });
});

describe('DestinationsSection — row rendering', () => {
  it('renders the destination label', () => {
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ label: 'Research' })]}
      />,
    );
    expect(screen.getByText('Research')).toBeDefined();
  });

  it('shows PRIMARY badge on the primary row only', () => {
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[
          makeDestination({ id: 'd1', label: 'Main Folder' }),
          makeDestination({ id: 'd2', label: 'Other Dest' }),
        ]}
        primaryId="d1"
      />,
    );
    const badges = screen.queryAllByText(/primary/i);
    expect(badges).toHaveLength(1);
  });

  it('shows no PRIMARY badge when primaryId does not match any row', () => {
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ id: 'd1' })]}
        primaryId="other"
      />,
    );
    expect(screen.queryByText(/primary/i)).toBeNull();
  });
});

describe('DestinationsSection — row rendering (timestamps)', () => {
  it('renders the last-used timestamp when lastUsed is set', () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ lastUsed: oneHourAgo })]}
      />,
    );
    expect(screen.getByText(/last used/i)).toBeDefined();
  });

  it('does not render a timestamp when lastUsed is absent', () => {
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ lastUsed: undefined })]}
      />,
    );
    expect(screen.queryByText(/last used/i)).toBeNull();
  });

  it('does not render a Rename button', () => {
    render(<DestinationsSection {...emptyProps} destinations={[makeDestination()]} />);
    expect(screen.queryByText(/rename/i)).toBeNull();
  });
});

describe('DestinationsSection — interactions', () => {
  it('calls onSetPrimary with the destination id when the star is clicked', async () => {
    const user = userEvent.setup();
    const onSetPrimary = vi.fn().mockResolvedValue(undefined);
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ id: 'd1' })]}
        onSetPrimary={onSetPrimary}
      />,
    );
    await user.click(screen.getByTestId('set-primary-d1'));
    expect(onSetPrimary).toHaveBeenCalledWith('d1');
  });

  it('calls onRemove with the destination id when Remove is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ id: 'd1' })]}
        onRemove={onRemove}
      />,
    );
    await user.click(screen.getByTestId('remove-destination-d1'));
    expect(onRemove).toHaveBeenCalledWith('d1');
  });
});

describe('DestinationsSection — rename', () => {
  it('calls onRename with the destination id and new label when the label is edited', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <DestinationsSection
        {...emptyProps}
        destinations={[makeDestination({ id: 'd1', label: 'Research' })]}
        onRename={onRename}
      />,
    );
    await user.click(screen.getByText('Research'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Science');
    await user.keyboard('{Enter}');
    expect(onRename).toHaveBeenCalledWith('d1', 'Science');
  });
});
