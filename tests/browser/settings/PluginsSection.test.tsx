import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { PluginsSection } from '@presentation/settings/sections/PluginsSection';
import type { PluginRow } from '@shared/pluginStatus';

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
    expect(screen.queryByTestId(TESTID_SUMMARY)).toBeNull();
  });

  it('does not render a plugin list', () => {
    render(<PluginsSection plugins={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('does not render empty state when plugins are provided', () => {
    render(<PluginsSection plugins={[{ id: 'x', name: 'X', state: 'active' }]} />);
    expect(screen.queryByText('No plugins registered')).toBeNull();
  });
});

const TESTID_SUMMARY = 'plugins-summary';
const NAME_OBSIDIAN = 'Obsidian Companion';

const SAMPLE_PLUGINS: PluginRow[] = [
  { id: 'wh.core.reader', name: 'Reader', version: '0.4.2', state: 'active' },
  { id: 'wh.core.highlights', name: 'Highlights', version: '0.4.2', state: 'active' },
  {
    id: 'wh.dest.obsidian',
    name: NAME_OBSIDIAN,
    version: '0.2.0',
    state: 'failed',
    error: 'companion app not detected on localhost:27124',
  },
  { id: 'wh.exp.readwise', name: 'Readwise Export', version: '0.1.0-beta', state: 'inactive' },
];

describe('PluginsSection — summary bar', () => {
  it('renders the summary bar when plugins are present', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByTestId(TESTID_SUMMARY)).not.toBeNull();
  });

  it('shows total count', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByTestId(TESTID_SUMMARY).textContent).toContain('4');
  });

  it('shows active, failed, and inactive counts', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    const bar = screen.getByTestId(TESTID_SUMMARY).textContent ?? '';
    expect(bar).toMatch(/2\s*active/);
    expect(bar).toMatch(/1\s*failed/);
    expect(bar).toMatch(/1\s*inactive/);
  });
});

describe('PluginsSection — plugin list', () => {
  it('renders a list with role="list"', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByRole('list')).not.toBeNull();
  });

  it('renders one list item per plugin', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(SAMPLE_PLUGINS.length);
  });

  it('shows plugin names', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByText('Reader')).not.toBeNull();
    expect(screen.getByText(NAME_OBSIDIAN)).not.toBeNull();
  });

  it('shows plugin ids', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByText('wh.core.reader')).not.toBeNull();
  });

  it('shows version with leading v', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getAllByText('v0.4.2').length).toBeGreaterThan(0);
  });

  it('state pill has aria-label equal to state value', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    const pills = document.querySelectorAll('[data-testid="state-pill"]');
    const labels = Array.from(pills).map((p) => p.getAttribute('aria-label'));
    expect(labels).toContain('active');
    expect(labels).toContain('failed');
    expect(labels).toContain('inactive');
  });
});

describe('PluginsSection — sort order', () => {
  it('renders failed plugins before active before inactive', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    const items = screen.getAllByRole('listitem');
    const names = items.map((li) => li.querySelector('[data-testid="plugin-name"]')?.textContent);
    expect(names[0]).toBe(NAME_OBSIDIAN);
    expect(names[names.length - 1]).toBe('Readwise Export');
  });
});

describe('PluginsSection — error block', () => {
  it('shows error text for a failed plugin', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByText(/companion app not detected/)).not.toBeNull();
  });

  it('error block has role="alert"', () => {
    render(<PluginsSection plugins={SAMPLE_PLUGINS} />);
    expect(screen.getByRole('alert')).not.toBeNull();
  });

  it('does not render error block for active plugins', () => {
    render(<PluginsSection plugins={[{ id: 'x', name: 'X', state: 'active' }]} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('PluginsSection — state pill label', () => {
  it('renders translated label text in the state pill, not the raw i18n key', () => {
    render(<PluginsSection plugins={[{ id: 'x', name: 'X', state: 'active' }]} />);
    const pill = document.querySelector('[data-testid="state-pill"]');
    expect(pill?.textContent).toBe('active');
  });
});

describe('PluginsSection — missing version', () => {
  it('does not render v when version is absent', () => {
    render(<PluginsSection plugins={[{ id: 'x', name: 'NoVersion', state: 'active' }]} />);
    const item = screen.getByText('NoVersion').closest('li');
    expect(item?.textContent).not.toMatch(/\bv\b/);
  });
});
