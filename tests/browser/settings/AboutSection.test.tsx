// tests/browser/settings/AboutSection.test.tsx
import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AboutSection } from '@presentation/settings/sections/AboutSection';

const TAGLINE = 'Capture, structure, and route the web to where your work already lives.';

afterEach(cleanup);

describe('AboutSection — Hero', () => {
  it('renders the product name', () => {
    render(<AboutSection />);
    expect(screen.getByText('Web Harvester')).toBeTruthy();
  });

  it('renders the tagline', () => {
    render(<AboutSection />);
    expect(screen.getByText(TAGLINE)).toBeTruthy();
  });

  it('renders the channel pill with text', () => {
    render(<AboutSection />);
    expect(screen.getAllByText(/stable/i).length).toBeGreaterThan(0);
  });
});

describe('AboutSection — Resources', () => {
  it('renders three resource row labels', () => {
    render(<AboutSection />);
    expect(screen.getByText('Source & docs on GitHub')).toBeTruthy();
    expect(screen.getByText('Report an issue')).toBeTruthy();
    expect(screen.getByText('Changelog')).toBeTruthy();
  });

  it('opens GitHub URL in a new tab on row click', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<AboutSection />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Source & docs on GitHub'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('github.com'),
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });
});

describe('AboutSection — Diagnostics', () => {
  it('renders the DIAGNOSTICS eyebrow', () => {
    render(<AboutSection />);
    expect(screen.getByText('DIAGNOSTICS')).toBeTruthy();
  });

  it('renders the version diagnostic row', () => {
    render(<AboutSection />);
    expect(screen.getByText('version')).toBeTruthy();
  });

  it('renders a Copy button', () => {
    render(<AboutSection />);
    expect(screen.getByText('Copy')).toBeTruthy();
  });

  it('flips Copy button to Copied on click', async () => {
    const clipSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<AboutSection />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Copy'));
    expect(screen.getByText('Copied')).toBeTruthy();
    clipSpy.mockRestore();
  });
});

describe('AboutSection — Legal', () => {
  it('renders the Open-source licenses link as an anchor', () => {
    render(<AboutSection />);
    const link = screen.getByText('Open-source licenses');
    expect(link.tagName.toLowerCase()).toBe('a');
  });

  it('renders the copyright line', () => {
    render(<AboutSection />);
    expect(screen.getByText(/© 2026 Web Harvester/)).toBeTruthy();
  });
});
