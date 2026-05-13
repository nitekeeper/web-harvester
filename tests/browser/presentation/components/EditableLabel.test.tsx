// tests/browser/presentation/components/EditableLabel.test.tsx

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditableLabel } from '@presentation/components/EditableLabel';

afterEach(() => {
  cleanup();
});

describe('EditableLabel — static state', () => {
  it('renders the label text as a span', () => {
    render(<EditableLabel value="My Folder" onCommit={vi.fn()} />);
    expect(screen.getByText('My Folder')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('EditableLabel — edit mode', () => {
  it('switches to an input when the span is clicked', async () => {
    const user = userEvent.setup();
    render(<EditableLabel value="My Folder" onCommit={vi.fn()} />);
    await user.click(screen.getByText('My Folder'));
    expect(screen.getByRole('textbox')).not.toBeNull();
  });

  it('pre-fills the input with the current value', async () => {
    const user = userEvent.setup();
    render(<EditableLabel value="My Folder" onCommit={vi.fn()} />);
    await user.click(screen.getByText('My Folder'));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('My Folder');
  });

  it('switches to an input when Enter is pressed on the span', async () => {
    const user = userEvent.setup();
    render(<EditableLabel value="My Folder" onCommit={vi.fn()} />);
    const span = screen.getByText('My Folder');
    span.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox')).not.toBeNull();
  });
});

describe('EditableLabel — commit', () => {
  it('calls onCommit with the new value when Enter is pressed', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'New Name');
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('New Name');
  });

  it('trims whitespace before committing on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '  Trimmed  ');
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith('Trimmed');
  });
});

describe('EditableLabel — commit no-op cases', () => {
  it('does not call onCommit when the value is unchanged', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not call onCommit when the input is cleared to empty', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not call onCommit when the input contains only whitespace', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '   ');
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('EditableLabel — cancel', () => {
  it('does not call onCommit when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<EditableLabel value="My Folder" onCommit={onCommit} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'New Name');
    await user.keyboard('{Escape}');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('restores the original label text after Escape', async () => {
    const user = userEvent.setup();
    render(<EditableLabel value="My Folder" onCommit={vi.fn()} />);
    await user.click(screen.getByText('My Folder'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'New Name');
    await user.keyboard('{Escape}');
    expect(screen.getByText('My Folder')).not.toBeNull();
  });
});
