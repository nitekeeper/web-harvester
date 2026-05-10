// src/presentation/settings/getAboutDiagnostics.ts

import { EXTENSION_VERSION } from '@shared/constants';

/** Diagnostic snapshot shown in the About page and copied to clipboard for bug reports. */
export interface AboutDiagnostics {
  readonly version: string;
  readonly build: string;
  readonly channel: string;
  readonly browser: string;
  readonly platform: string;
}

/** Brand name substrings to skip when picking the display brand. */
const SKIP_BRANDS = ['not a brand', 'chromium'];

/** Picks the most human-readable browser brand from the brands list, skipping
 *  generic entries like "Not A Brand" and "Chromium". Returns empty string for
 *  an empty list. */
function pickBrand(brands: readonly { brand: string; version: string }[]): string {
  const filtered = brands.filter(
    (b) => !SKIP_BRANDS.some((skip) => b.brand.toLowerCase().includes(skip)),
  );
  const chosen = filtered.length > 0 ? filtered[filtered.length - 1] : brands[0];
  if (!chosen) return '';
  return `${chosen.brand} ${chosen.version}`;
}

/** Shape of the Chromium-only `navigator.userAgentData` object used for browser detection. */
interface UserAgentData {
  readonly brands: readonly { brand: string; version: string }[];
  readonly platform: string;
}

/**
 * Returns a snapshot of version, build, channel, browser, and platform for
 * display in the About section and for clipboard copy. Reads Vite env vars
 * for build/channel; reads `navigator.userAgentData` for browser/platform
 * with a graceful fallback for non-Chromium environments.
 */
export function getAboutDiagnostics(): AboutDiagnostics {
  const build = import.meta.env.VITE_BUILD ?? '';
  const channel = import.meta.env.VITE_CHANNEL || 'stable';

  const uad = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
  const browser = uad ? pickBrand(uad.brands) : '';
  const platform = uad ? uad.platform : '';

  return { version: EXTENSION_VERSION, build, channel, browser, platform };
}
