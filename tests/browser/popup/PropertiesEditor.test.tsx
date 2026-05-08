import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { PropertiesEditor } from '@presentation/popup/components/PropertiesEditor';

const WITH_FM = '---\ntitle: My Page\nauthor: Jane\n---\n\n# Body';
const WITHOUT_FM = '# No frontmatter\n\nBody.';
const TESTID_EDITOR = 'properties-editor';
const TESTID_EMPTY = 'properties-empty';
const TESTID_LOADING = 'properties-loading';
const TESTID_TITLE_INPUT = 'prop-input-title';
const TESTID_AUTHOR_INPUT = 'prop-input-author';

async function editTitleField(newValue: string) {
  const input = document.querySelector(`[data-testid="${TESTID_TITLE_INPUT}"]`) as HTMLInputElement;
  const user = userEvent.setup();
  await user.clear(input);
  await user.type(input, newValue);
  return input;
}

function getLastOnChangeCall(onChange: ReturnType<typeof vi.fn>) {
  const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
  return lastCall?.[0] as string;
}

describe('PropertiesEditor — empty and loading states', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an empty-state placeholder when markdown has no frontmatter', () => {
    render(<PropertiesEditor markdown={WITHOUT_FM} onMarkdownChange={vi.fn()} />);
    expect(document.querySelector(`[data-testid="${TESTID_EDITOR}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="${TESTID_EMPTY}"]`)).not.toBeNull();
  });

  it('renders a loading skeleton when isPreviewing is true and fields.length === 0', () => {
    render(
      <PropertiesEditor markdown={WITHOUT_FM} onMarkdownChange={vi.fn()} isPreviewing={true} />,
    );
    expect(document.querySelector(`[data-testid="${TESTID_LOADING}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="${TESTID_EMPTY}"]`)).toBeNull();
  });

  it('does not render a loading skeleton when isPreviewing is false', () => {
    render(
      <PropertiesEditor markdown={WITHOUT_FM} onMarkdownChange={vi.fn()} isPreviewing={false} />,
    );
    expect(document.querySelector(`[data-testid="${TESTID_LOADING}"]`)).toBeNull();
    expect(document.querySelector(`[data-testid="${TESTID_EMPTY}"]`)).not.toBeNull();
  });
});

describe('PropertiesEditor — field editing', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an input for each frontmatter field', () => {
    render(<PropertiesEditor markdown={WITH_FM} onMarkdownChange={vi.fn()} />);
    expect(document.querySelector(`[data-testid="${TESTID_TITLE_INPUT}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="${TESTID_AUTHOR_INPUT}"]`)).not.toBeNull();
  });

  it('displays current field values as input values', () => {
    render(<PropertiesEditor markdown={WITH_FM} onMarkdownChange={vi.fn()} />);
    const input = document.querySelector(
      `[data-testid="${TESTID_TITLE_INPUT}"]`,
    ) as HTMLInputElement;
    expect(input.value).toBe('My Page');
  });

  it('calls onMarkdownChange with rebuilt markdown after a field edit', async () => {
    const onChange = vi.fn();
    render(<PropertiesEditor markdown={WITH_FM} onMarkdownChange={onChange} />);
    await editTitleField('X');
    expect(onChange).toHaveBeenCalled();
    const lastArg = getLastOnChangeCall(onChange);
    expect(lastArg).toContain('title: X');
    expect(lastArg).toContain('author: Jane');
  });

  it('preserves the body section in the rebuilt markdown', async () => {
    const onChange = vi.fn();
    render(<PropertiesEditor markdown={WITH_FM} onMarkdownChange={onChange} />);
    await editTitleField('X');
    const lastArg = getLastOnChangeCall(onChange);
    expect(lastArg).toContain('# Body');
  });
});
