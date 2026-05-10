// tests/unit/presentation/settings/aboutConfig.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAboutConfig } from '@presentation/settings/aboutConfig';

describe('buildAboutConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds github resource links from the base url', () => {
    const config = buildAboutConfig();
    expect(config.links.gh).toContain('github.com');
    expect(config.links.issues).toBe(`${config.links.gh}/issues`);
    expect(config.links.changelog).toBe(`${config.links.gh}/releases`);
  });

  it('constructs the licenses url from window.location.origin', () => {
    vi.stubGlobal('location', { origin: 'chrome-extension://abc123' });
    const config = buildAboutConfig();
    expect(config.legal.licenses).toBe('chrome-extension://abc123/licenses.html');
  });
});
