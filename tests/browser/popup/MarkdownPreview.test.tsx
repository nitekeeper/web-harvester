// tests/browser/popup/MarkdownPreview.test.tsx
//
// Browser-mode tests for the markdown preview component. Asserts placeholder
// text when markdown is empty and pre-rendered content when non-empty.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { MarkdownPreview } from '@presentation/popup/components/MarkdownPreview';

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
    expect(screen.getByTestId('markdown-preview').textContent).toBe('# Hello');
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
});
