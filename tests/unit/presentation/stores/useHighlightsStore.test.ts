import { beforeEach, describe, expect, it } from 'vitest';

import type { Highlight } from '@application/HighlightService';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';

const SAMPLE: Highlight = {
  id: 'h1',
  url: 'https://example.com',
  text: 'Important passage',
  color: 'yellow',
  xpath: '/html/body/p[1]',
  createdAt: 1000,
};

describe('useHighlightsStore', () => {
  beforeEach(() => {
    useHighlightsStore.setState({ highlights: [], isLoading: false });
  });

  it('starts with empty highlights and isLoading false', () => {
    const { highlights, isLoading } = useHighlightsStore.getState();
    expect(highlights).toEqual([]);
    expect(isLoading).toBe(false);
  });

  it('setHighlights replaces the highlights array', () => {
    useHighlightsStore.getState().setHighlights([SAMPLE]);
    expect(useHighlightsStore.getState().highlights).toEqual([SAMPLE]);
  });

  it('setLoading updates the loading flag', () => {
    useHighlightsStore.getState().setLoading(true);
    expect(useHighlightsStore.getState().isLoading).toBe(true);
  });

  it('setHighlights with an empty array clears the list', () => {
    useHighlightsStore.getState().setHighlights([SAMPLE]);
    useHighlightsStore.getState().setHighlights([]);
    expect(useHighlightsStore.getState().highlights).toEqual([]);
  });
});
