import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Highlight } from '@application/HighlightService';
import { HighlightsTab } from '@presentation/side-panel/components/HighlightsTab';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';

const H1: Highlight = {
  id: 'h1',
  url: 'https://example.com',
  text: 'A very important passage from the article.',
  color: 'yellow',
  xpath: '/html/body/p[1]',
  createdAt: 1000,
};

const H2: Highlight = {
  id: 'h2',
  url: 'https://example.com',
  text: 'Another highlighted sentence.',
  color: 'green',
  xpath: '/html/body/p[2]',
  createdAt: 2000,
};

describe('HighlightsTab', () => {
  beforeEach(() => {
    useHighlightsStore.setState({ highlights: [], isLoading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the empty-state notice when there are no highlights', () => {
    render(<HighlightsTab />);
    expect(document.querySelector('[data-testid="highlights-empty"]')).not.toBeNull();
  });

  it('does not show the list or empty state while loading', () => {
    useHighlightsStore.setState({ highlights: [], isLoading: true });
    render(<HighlightsTab />);
    expect(document.querySelector('[data-testid="highlights-empty"]')).toBeNull();
    expect(document.querySelector('[data-testid="highlights-list"]')).toBeNull();
  });

  it('renders a card for each highlight', () => {
    useHighlightsStore.setState({ highlights: [H1, H2], isLoading: false });
    render(<HighlightsTab />);
    const cards = document.querySelectorAll('[data-testid="highlight-card"]');
    expect(cards.length).toBe(2);
  });

  it('renders the highlight text inside the card', () => {
    useHighlightsStore.setState({ highlights: [H1], isLoading: false });
    render(<HighlightsTab />);
    const card = document.querySelector('[data-testid="highlight-card"]');
    expect(card?.textContent).toContain('A very important passage');
  });

  it('renders the highlights list container when highlights exist', () => {
    useHighlightsStore.setState({ highlights: [H1], isLoading: false });
    render(<HighlightsTab />);
    expect(document.querySelector('[data-testid="highlights-list"]')).not.toBeNull();
  });
});
