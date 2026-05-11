// src/presentation/settings/sections/_aboutLegal.tsx
//
// Legal block sub-component used exclusively by AboutSection.tsx.
// Not exported from the public settings barrel — treat as private.

import { BORDER_1, C, Eyebrow } from './_aboutShared';

/** Props for the legal section. */
export interface LegalBlockProps {
  /** URL of the open-source licenses page. */
  readonly licensesUrl: string;
  /** Eyebrow heading label. */
  readonly heading: string;
  /** Visible link text for the licenses page. */
  readonly licensesLabel: string;
  /** Copyright line text. */
  readonly copyright: string;
  /** License notice line (e.g. "Released under the MIT License."). */
  readonly licenseNotice: string;
}

/** Legal section — open-source licenses link and copyright line. */
export function LegalBlock({
  licensesUrl,
  heading,
  licensesLabel,
  copyright,
  licenseNotice,
}: LegalBlockProps) {
  return (
    <>
      <Eyebrow label={heading} />
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <a
          href={licensesUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: C.text,
            textDecoration: 'none',
            borderBottom: BORDER_1,
            paddingBottom: 1,
          }}
        >
          {licensesLabel}
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
