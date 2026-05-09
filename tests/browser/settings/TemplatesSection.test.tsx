// tests/browser/settings/TemplatesSection.test.tsx
//
// Browser-mode tests for the settings templates section.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { TemplatesSection } from '@presentation/settings/sections/TemplatesSection';
import type { TemplateConfig } from '@shared/types';

const sampleTemplates: readonly TemplateConfig[] = [
  {
    id: 't1',
    name: 'Default',
    frontmatterTemplate: '',
    bodyTemplate: '{{content}}',
    noteNameTemplate: '{{title}}',
  },
];

describe('TemplatesSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the section heading', () => {
    render(<TemplatesSection />);
    expect(screen.getByText('Templates')).not.toBeNull();
  });

  it('renders template rows with rounded-md for the large-card radius', () => {
    render(<TemplatesSection templates={sampleTemplates} />);
    const row = document.querySelector('.rounded-md.border');
    expect(row).not.toBeNull();
  });
});
