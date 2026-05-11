// src/presentation/settings/aboutConfig.ts

/** External resource links shown in the About page Resources section. */
export interface AboutLinks {
  /** GitHub repository (source + docs). */
  readonly gh: string;
  /** GitHub issues tracker. */
  readonly issues: string;
  /** Changelog / releases page. */
  readonly changelog: string;
}

/** Legal section links shown in the About page. */
export interface AboutLegal {
  /** In-extension open-source licenses page. Constructed at runtime from `window.location.origin`. */
  readonly licenses: string;
  /** In-extension privacy policy page. Constructed at runtime from `window.location.origin`. */
  readonly privacy: string;
}

/** Full config contract for the About section. */
export interface AboutConfig {
  readonly links: AboutLinks;
  readonly legal: AboutLegal;
}

const GH_BASE = 'https://github.com/nitekeeper/web-harvester';

/** Builds the About page config. `legal.licenses` is derived from the
 *  extension's own origin so it works across any extension ID. */
export function buildAboutConfig(): AboutConfig {
  return {
    links: {
      gh: GH_BASE,
      issues: `${GH_BASE}/issues`,
      changelog: `${GH_BASE}/releases`,
    },
    legal: {
      licenses: `${window.location.origin}/licenses.html`,
      privacy: `${window.location.origin}/privacy.html`,
    },
  };
}
