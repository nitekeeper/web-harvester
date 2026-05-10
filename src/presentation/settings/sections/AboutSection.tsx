// src/presentation/settings/sections/AboutSection.tsx

import { AboutIcon, FileIcon, GitHubIcon } from '@presentation/components/icons';
import { type FormatMessageFn, useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { buildAboutConfig, type AboutConfig } from '@presentation/settings/aboutConfig';
import {
  getAboutDiagnostics,
  type AboutDiagnostics,
} from '@presentation/settings/getAboutDiagnostics';

import { DiagnosticsBlock, HeroCard, LegalBlock, ResourcesCard } from './_aboutParts';
import type { ResourceRowDef } from './_aboutParts';

/** Localised strings used in the About section. */
interface AboutStrings {
  readonly pageTitle: string;
  readonly productName: string;
  readonly tagline: string;
  readonly resourcesHeading: string;
  readonly ghLabel: string;
  readonly issuesLabel: string;
  readonly changelogLabel: string;
  readonly changelogMeta: string;
  readonly diagHeading: string;
  readonly copyLabel: string;
  readonly copiedLabel: string;
  readonly legalHeading: string;
  readonly licensesLabel: string;
  readonly copyright: string;
}

/** Builds all localised strings for the About section in one pass. */
function buildAboutStrings(fmt: FormatMessageFn, version: string): AboutStrings {
  return {
    pageTitle: fmt({ id: 'about.pageTitle', defaultMessage: 'Web Harvester — About' }),
    productName: fmt({ id: 'about.productName', defaultMessage: 'Web Harvester' }),
    tagline: fmt({
      id: 'about.tagline',
      defaultMessage: 'Capture, structure, and route the web to where your work already lives.',
    }),
    resourcesHeading: fmt({ id: 'about.resources.heading', defaultMessage: 'RESOURCES' }),
    ghLabel: fmt({ id: 'about.resources.gh', defaultMessage: 'Source & docs on GitHub' }),
    issuesLabel: fmt({ id: 'about.resources.issues', defaultMessage: 'Report an issue' }),
    changelogLabel: fmt({ id: 'about.resources.changelog', defaultMessage: 'Changelog' }),
    changelogMeta: fmt({
      id: 'about.resources.changelog.meta',
      defaultMessage: "What's new in {version}",
      values: { version },
    }),
    diagHeading: fmt({ id: 'about.diagnostics.heading', defaultMessage: 'DIAGNOSTICS' }),
    copyLabel: fmt({ id: 'about.diagnostics.copy', defaultMessage: 'Copy' }),
    copiedLabel: fmt({ id: 'about.diagnostics.copied', defaultMessage: 'Copied' }),
    legalHeading: fmt({ id: 'about.legal.heading', defaultMessage: 'LEGAL' }),
    licensesLabel: fmt({ id: 'about.legal.licenses', defaultMessage: 'Open-source licenses' }),
    copyright: fmt({
      id: 'about.legal.copyright',
      defaultMessage: '© 2026 Web Harvester. Made for people who read on the web.',
    }),
  };
}

/** Builds the three resource rows from config, diagnostics, and localised strings. */
function buildResourceRows(
  config: AboutConfig,
  diag: AboutDiagnostics,
  s: AboutStrings,
): readonly ResourceRowDef[] {
  return [
    {
      id: 'gh',
      label: s.ghLabel,
      meta: 'github.com/nitekeeper/web-harvester',
      metaMono: true,
      icon: <GitHubIcon />,
      url: config.links.gh,
    },
    {
      id: 'issues',
      label: s.issuesLabel,
      meta: 'github.com/nitekeeper/web-harvester/issues',
      metaMono: true,
      icon: <AboutIcon />,
      url: config.links.issues,
    },
    {
      id: 'change',
      label: s.changelogLabel,
      meta: s.changelogMeta,
      metaMono: false,
      icon: <FileIcon />,
      url: config.links.changelog,
    },
  ];
}

/** Full About settings section — Hero, Resources, Diagnostics, Legal. */
export function AboutSection() {
  const fmt = useFormatMessage();
  const diag = getAboutDiagnostics();
  const config = buildAboutConfig();
  const s = buildAboutStrings(fmt, diag.version);
  const rows = buildResourceRows(config, diag, s);

  return (
    <div data-testid="about-section" style={{ padding: '22px 26px', maxWidth: 760 }}>
      <h1 className="sr-only">{s.pageTitle}</h1>
      <HeroCard
        name={s.productName}
        versionLabel={`v${diag.version}`}
        channel={diag.channel}
        tagline={s.tagline}
      />
      <ResourcesCard rows={rows} heading={s.resourcesHeading} />
      <DiagnosticsBlock
        version={diag.version}
        build={diag.build}
        channel={diag.channel}
        browser={diag.browser}
        platform={diag.platform}
        heading={s.diagHeading}
        copyLabel={s.copyLabel}
        copiedLabel={s.copiedLabel}
      />
      <LegalBlock
        licensesUrl={config.legal.licenses}
        heading={s.legalHeading}
        licensesLabel={s.licensesLabel}
        copyright={s.copyright}
      />
    </div>
  );
}
