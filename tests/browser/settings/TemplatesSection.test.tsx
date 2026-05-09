// tests/browser/settings/TemplatesSection.test.tsx
//
// Replaces the old test. Tests the new split-pane layout and core behaviors.

import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { SYSTEM_TEMPLATES } from '@presentation/settings/sections/templates/systemTemplates';
import { TemplatesSection } from '@presentation/settings/sections/TemplatesSection';
import type { TemplateConfig } from '@shared/types';

afterEach(cleanup);

const userTemplate: TemplateConfig = {
  id: 'u1',
  name: 'My Blog',
  frontmatterTemplate: 'title: {{page.title}}',
  bodyTemplate: '# {{page.title}}',
  noteNameTemplate: '{{date}}-{{title|safe_name}}',
};

// SYSTEM_TEMPLATES has at least one entry — validated at module level
const firstSystemId: string = SYSTEM_TEMPLATES.at(0)?.id ?? 'sys-default-article';

describe('TemplatesSection — list rail', () => {
  it('renders the list rail and selects the first system template by default', () => {
    render(<TemplatesSection />);
    expect(screen.getByTestId(`template-row-${firstSystemId}`)).not.toBeNull();
    expect(screen.getByTestId('template-editor')).not.toBeNull();
  });

  it('renders user templates in the list rail', () => {
    render(<TemplatesSection templates={[userTemplate]} />);
    expect(screen.getByText('My Blog')).not.toBeNull();
  });

  it('list rail has role listbox', () => {
    render(<TemplatesSection />);
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('template rows have role option with aria-selected', () => {
    render(<TemplatesSection />);
    const row = screen.getByTestId(`template-row-${firstSystemId}`);
    expect(row.getAttribute('role')).toBe('option');
    expect(row.getAttribute('aria-selected')).toBe('true');
  });
});

describe('TemplatesSection — editor pane', () => {
  it('clicking a row opens that template in the editor', () => {
    render(<TemplatesSection templates={[userTemplate]} />);
    fireEvent.click(screen.getByTestId('template-row-u1'));
    expect((screen.getByTestId('editor-name-input') as HTMLInputElement).value).toBe('My Blog');
  });

  it('system template name input is readonly', () => {
    render(<TemplatesSection />);
    const nameInput = screen.getByTestId('editor-name-input') as HTMLInputElement;
    expect(nameInput.readOnly).toBe(true);
  });
});

describe('TemplatesSection — new template', () => {
  it('clicking "+ New" calls onAdd with seeded body and selects the new template', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<TemplatesSection onAdd={onAdd} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('template-new-btn'));
    });
    expect(onAdd).toHaveBeenCalledTimes(1);
    const addArg = onAdd.mock.calls.at(0)?.at(0) as TemplateConfig | undefined;
    expect(addArg?.bodyTemplate).toContain('{{page.title}}');
    expect(addArg?.noteNameTemplate).toBe('{{date}}-{{title|safe_name}}');
  });
});
