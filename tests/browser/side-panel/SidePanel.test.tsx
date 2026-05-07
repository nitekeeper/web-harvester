// tests/browser/side-panel/SidePanel.test.tsx
import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';

import { SidePanel } from '@presentation/side-panel/SidePanel';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';

const NOOP = (): void => undefined;
const SEL_TAB_HIGHLIGHTS = '[data-testid="sidepanel-tab-highlights"]';

/** Returns the close button in the side panel header, asserting it exists. */
function getCloseButton(): HTMLElement {
  const btn = document.querySelector('[data-testid="sidepanel-close-btn"]');
  if (btn === null) throw new Error('close button not found');
  return btn as HTMLElement;
}

describe('SidePanel — header & shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the app title in the header', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(screen.getByText('Web Harvester')).not.toBeNull();
  });

  it('renders the WHLogo svg in the header', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(document.querySelector('[data-testid="sidepanel-header"] svg')).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', async () => {
    let closed = false;
    render(
      <SidePanel
        onClose={() => {
          closed = true;
        }}
        onSave={NOOP}
      />,
    );
    await userEvent.setup().click(getCloseButton());
    expect(closed).toBe(true);
  });

  it('renders the three tabs', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(document.querySelector(SEL_TAB_HIGHLIGHTS)).not.toBeNull();
    expect(document.querySelector('[data-testid="sidepanel-tab-reader"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="sidepanel-tab-clip"]')).not.toBeNull();
  });
});

describe('SidePanel — clip tab content', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the destination selector on the Clip tab by default', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    // Clip tab is default
    expect(document.querySelector('[data-testid="destination-selector"]')).not.toBeNull();
  });

  it('renders the save button on the Clip tab by default', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(document.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('renders the markdown preview area on the Clip tab', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(document.querySelector('[data-testid="markdown-preview"]')).not.toBeNull();
  });

  it('does not render full settings navigation', () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    expect(document.querySelector('[data-testid="settings-sidebar"]')).toBeNull();
  });

  it('switches to Highlights tab when clicked', async () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    const highlightsTab = document.querySelector(SEL_TAB_HIGHLIGHTS);
    if (highlightsTab === null) throw new Error('highlights tab not found');
    await userEvent.setup().click(highlightsTab as HTMLElement);
    expect(document.querySelector('[data-testid="destination-selector"]')).toBeNull();
  });
});

describe('SidePanel — highlights tab', () => {
  afterEach(() => {
    cleanup();
    useHighlightsStore.setState({ highlights: [], isLoading: false });
  });

  it('shows the highlights tab content when the Highlights tab is clicked', async () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    const tab = document.querySelector(SEL_TAB_HIGHLIGHTS);
    if (!tab) throw new Error('highlights tab not found');
    await userEvent.setup().click(tab as HTMLElement);
    expect(document.querySelector('[data-testid="highlights-empty"]')).not.toBeNull();
  });
});

describe('SidePanel — reader tab', () => {
  afterEach(() => {
    cleanup();
    usePopupStore.setState({ isReaderActive: false });
  });

  it('shows the reader tab content when the Reader tab is clicked', async () => {
    render(<SidePanel onClose={NOOP} onSave={NOOP} />);
    const tab = document.querySelector('[data-testid="sidepanel-tab-reader"]');
    if (!tab) throw new Error('reader tab not found');
    await userEvent.setup().click(tab as HTMLElement);
    expect(document.querySelector('[data-testid="reader-tab"]')).not.toBeNull();
  });
});
