// tests/unit/presentation/settings/getAboutDiagnostics.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAboutDiagnostics } from '@presentation/settings/getAboutDiagnostics';

const originalUserAgentData = Object.getOwnPropertyDescriptor(navigator, 'userAgentData');

/** Restores navigator.userAgentData to its original descriptor after each test. */
function restoreUserAgentData(): void {
  if (originalUserAgentData) {
    Object.defineProperty(navigator, 'userAgentData', originalUserAgentData);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  restoreUserAgentData();
});

describe('getAboutDiagnostics — version', () => {
  it('returns a non-empty version string from the shared constant', () => {
    const result = getAboutDiagnostics();
    expect(typeof result.version).toBe('string');
    expect(result.version.length).toBeGreaterThan(0);
  });
});

describe('getAboutDiagnostics — build', () => {
  it('returns build from VITE_BUILD env var', () => {
    vi.stubEnv('VITE_BUILD', '2026.05.10-abc1234');
    const result = getAboutDiagnostics();
    expect(result.build).toBe('2026.05.10-abc1234');
  });

  it('falls back to empty string when VITE_BUILD is not set', () => {
    vi.stubEnv('VITE_BUILD', '');
    const result = getAboutDiagnostics();
    expect(result.build).toBe('');
  });
});

describe('getAboutDiagnostics — channel', () => {
  it('returns channel from VITE_CHANNEL env var', () => {
    vi.stubEnv('VITE_CHANNEL', 'beta');
    const result = getAboutDiagnostics();
    expect(result.channel).toBe('beta');
  });

  it('defaults channel to "stable" when VITE_CHANNEL is not set', () => {
    vi.stubEnv('VITE_CHANNEL', '');
    const result = getAboutDiagnostics();
    expect(result.channel).toBe('stable');
  });
});

describe('getAboutDiagnostics — browser and platform', () => {
  it('reads browser brand from navigator.userAgentData', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: {
        brands: [
          { brand: 'Not A Brand', version: '99' },
          { brand: 'Chromium', version: '134' },
          { brand: 'Google Chrome', version: '134' },
        ],
        platform: 'macOS',
        getHighEntropyValues: vi.fn().mockResolvedValue({ platformVersion: '15.4.1' }),
      },
      configurable: true,
    });
    const result = getAboutDiagnostics();
    expect(result.browser).toContain('Chrome');
  });

  it('returns empty string for browser and platform when userAgentData is unavailable', () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: undefined,
      configurable: true,
    });
    const result = getAboutDiagnostics();
    expect(result.browser).toBe('');
    expect(result.platform).toBe('');
  });
});
