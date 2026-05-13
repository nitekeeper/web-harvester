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

/** Matches all "Not A Brand" variants Chrome uses to prevent UA sniffing (e.g. "Not/A)Brand", "Not=A?Brand"). */
const NOT_BRAND_RE = /not.+brand/i;

/** Picks the most human-readable browser brand from the brands list.
 *  Strips all "Not A Brand" variants, then prefers non-Chromium entries.
 *  Falls back to Chromium if that is the only real brand present.
 *  Returns empty string for an empty list. */
function pickBrand(brands: readonly { brand: string; version: string }[]): string {
  const real = brands.filter((b) => !NOT_BRAND_RE.test(b.brand));
  const preferred = real.filter((b) => b.brand.toLowerCase() !== 'chromium');
  const chosen = preferred.at(-1) ?? real.at(-1);
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
  const build = import.meta.env.VITE_BUILD;
  const channel = import.meta.env.VITE_CHANNEL || 'stable';

  const uad = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
  const browser = uad ? pickBrand(uad.brands) : '';
  const platform = uad ? uad.platform : '';

  return { version: EXTENSION_VERSION, build, channel, browser, platform };
}
