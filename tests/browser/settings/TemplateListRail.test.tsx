// tests/browser/settings/TemplateListRail.test.tsx

import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { SYSTEM_TEMPLATES } from '@presentation/settings/sections/templates/systemTemplates';
import { TemplateListRail } from '@presentation/settings/sections/templates/TemplateListRail';
import type { TemplateView } from '@presentation/settings/sections/templates/templateTypes';

const userTemplate: TemplateView = {
  id: 'u1',
  name: 'My Blog',
  isSystem: false,
  frontmatterTemplate: '',
  bodyTemplate: '',
  noteNameTemplate: '',
};

afterEach(cleanup);

describe('TemplateListRail — structure', () => {
  it('renders a "+ New" button', () => {
    render(
      <TemplateListRail templates={[]} selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />,
    );
    expect(screen.getByTestId('template-new-btn')).not.toBeNull();
  });

  it('renders each template name', () => {
    const sysTemplate = SYSTEM_TEMPLATES[0] as TemplateView;
    const templates = [{ ...sysTemplate }, userTemplate];
    render(
      <TemplateListRail
        templates={templates}
        selectedId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
      />,
    );
    expect(screen.getByText(sysTemplate.name)).not.toBeNull();
    expect(screen.getByText('My Blog')).not.toBeNull();
  });
});

describe('TemplateListRail — filter input', () => {
  it('hides the filter input when fewer than 4 templates', () => {
    render(
      <TemplateListRail
        templates={[userTemplate]}
        selectedId={null}
        onSelect={vi.fn()}
        onNew={vi.fn()}
      />,
    );
    expect(screen.queryByPlaceholderText('Filter templates…')).toBeNull();
  });

  it('shows the filter input when 4 or more templates exist', () => {
    const many: TemplateView[] = Array.from({ length: 4 }, (_, i) => ({
      id: `u${i}`,
      name: `T${i}`,
      isSystem: false,
      frontmatterTemplate: '',
      bodyTemplate: '',
      noteNameTemplate: '',
    }));
    render(
      <TemplateListRail templates={many} selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />,
    );
    expect(screen.getByPlaceholderText('Filter templates…')).not.toBeNull();
  });
});

describe('TemplateListRail — interactions', () => {
  it('calls onNew when "+ New" is clicked', () => {
    const onNew = vi.fn();
    render(<TemplateListRail templates={[]} selectedId={null} onSelect={vi.fn()} onNew={onNew} />);
    fireEvent.click(screen.getByTestId('template-new-btn'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the template id when a row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <TemplateListRail
        templates={[userTemplate]}
        selectedId={null}
        onSelect={onSelect}
        onNew={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('template-row-u1'));
    expect(onSelect).toHaveBeenCalledWith('u1');
  });

  it('marks the selected row with aria-selected', () => {
    render(
      <TemplateListRail
        templates={[userTemplate]}
        selectedId="u1"
        onSelect={vi.fn()}
        onNew={vi.fn()}
      />,
    );
    const row = screen.getByTestId('template-row-u1');
    expect(row.getAttribute('aria-selected')).toBe('true');
  });
});
