// tests/browser/popup/TemplateSelector.test.tsx
//
// Browser-mode tests for the popup template selector. Asserts placeholder
// text when no template is selected and template names when populated.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { TemplateSelector } from '@presentation/popup/components/TemplateSelector';
import type { TemplateConfig } from '@shared/types';

const NOOP = (): void => undefined;

const sampleTemplates: readonly TemplateConfig[] = [
  {
    id: 't1',
    name: 'Default',
    frontmatterTemplate: '',
    bodyTemplate: '{{content}}',
    noteNameTemplate: '{{title}}',
  },
];

describe('TemplateSelector', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the "Select template…" placeholder when no template is selected', () => {
    render(<TemplateSelector templates={[]} selectedId={null} onSelect={NOOP} />);
    const trigger = document.querySelector('[data-testid="template-selector"]');
    expect(trigger?.textContent).toContain('Select template…');
  });

  it('renders template names when templates are provided', () => {
    render(<TemplateSelector templates={sampleTemplates} selectedId="t1" onSelect={NOOP} />);
    expect(screen.getByText('Default')).not.toBeNull();
  });

  it('renders an SVG icon inside the trigger', () => {
    render(<TemplateSelector templates={[]} selectedId={null} onSelect={NOOP} />);
    const trigger = document.querySelector('[data-testid="template-selector"]');
    expect(trigger?.querySelector('svg')).not.toBeNull();
  });
});
