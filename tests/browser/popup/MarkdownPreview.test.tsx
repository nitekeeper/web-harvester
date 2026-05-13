// tests/browser/popup/MarkdownPreview.test.tsx
//
// Browser-mode tests for the markdown preview component. Asserts placeholder
// text when markdown is empty and pre-rendered content when non-empty.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { MarkdownPreview } from '@presentation/popup/components/MarkdownPreview';

const TESTID_PREVIEW = 'markdown-preview';

describe('MarkdownPreview', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows placeholder text when markdown is empty', () => {
    render(<MarkdownPreview markdown="" />);
    expect(screen.getByText('Preview will appear here')).not.toBeNull();
  });

  it('renders pre-formatted content when markdown is non-empty', () => {
    render(<MarkdownPreview markdown="# Hello" />);
    expect(screen.getByTestId(TESTID_PREVIEW).textContent).toBe('# Hello');
  });

  it('renders a loading indicator when isPreviewing is true', () => {
    render(<MarkdownPreview markdown="" isPreviewing={true} />);
    expect(document.querySelector('[data-testid="markdown-preview"]')).not.toBeNull();
    expect(screen.getByText('Loading preview…')).not.toBeNull();
  });

  it('renders normal placeholder when isPreviewing is false and markdown is empty', () => {
    render(<MarkdownPreview markdown="" isPreviewing={false} />);
    expect(screen.getByText('Preview will appear here')).not.toBeNull();
  });

  it('applies preview-scroll class to the pre element for custom scrollbar styling', () => {
    render(<MarkdownPreview markdown="# Hello" />);
    expect(screen.getByTestId(TESTID_PREVIEW).classList.contains('wh-scroll')).toBe(true);
  });

  it('applies rounded-sm to the pre element for medium-container radius', () => {
    render(<MarkdownPreview markdown="# Hello" />);
    expect(screen.getByTestId(TESTID_PREVIEW).classList.contains('rounded-sm')).toBe(true);
  });
});
