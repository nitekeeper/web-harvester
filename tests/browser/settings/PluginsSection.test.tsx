import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { PluginsSection } from '@presentation/settings/sections/PluginsSection';

afterEach(() => {
  cleanup();
});

describe('PluginsSection — empty state', () => {
  it('renders the section container', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.getByTestId('plugins-section')).not.toBeNull();
  });

  it('shows the "No plugins registered" headline', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.getByText('No plugins registered')).not.toBeNull();
  });

  it('shows the sub-copy text', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.getByText(/Plugins listed in the manifest will appear here/)).not.toBeNull();
  });

  it('does not render a summary bar', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.queryByTestId('plugins-summary')).toBeNull();
  });

  it('does not render a plugin list', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});
