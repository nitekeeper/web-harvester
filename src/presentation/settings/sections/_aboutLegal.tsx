// src/presentation/settings/sections/_aboutLegal.tsx
//
// Legal block sub-component used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { BORDER_1, C, Eyebrow } from './_aboutShared';

/** Props for the legal section. */
interface LegalBlockProps {
  /** URL of the open-source licenses page. */
  readonly licensesUrl: string;
  /** URL of the privacy policy page. */
  readonly privacyUrl: string;
  /** Eyebrow heading label. */
  readonly heading: string;
  /** Visible link text for the licenses page. */
  readonly licensesLabel: string;
  /** Visible link text for the privacy policy page. */
  readonly privacyLabel: string;
  /** Copyright line text. */
  readonly copyright: string;
  /** License notice line (e.g. "Released under the MIT License."). */
  readonly licenseNotice: string;
}

const LINK_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: C.text,
  textDecoration: 'none',
  borderBottom: BORDER_1,
  paddingBottom: 1,
};

/** Legal section — open-source licenses link, privacy policy link, and copyright line. */
export function LegalBlock({
  licensesUrl,
  privacyUrl,
  heading,
  licensesLabel,
  privacyLabel,
  copyright,
  licenseNotice,
}: LegalBlockProps) {
  return (
    <>
      <Eyebrow label={heading} />
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <a href={licensesUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
          {licensesLabel}
        </a>
        <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
          {privacyLabel}
        </a>
      </div>
      <p style={{ marginTop: 18, fontSize: 11, fontWeight: 400, lineHeight: 1.6, color: C.subtle }}>
        {copyright}
        <br />
        {licenseNotice}
      </p>
    </>
  );
}
