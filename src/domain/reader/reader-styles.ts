/**
 * CSS injected into tabs when reader mode is activated.
 *
 * Defines a clean, distraction-free typography stack and hides common
 * non-content elements (navigation, sidebars, ads). The styles intentionally
 * use `!important` on the hide rules so they reliably override page styles.
 */
export const READER_CSS = `
  body {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.125rem;
    line-height: 1.75;
    color: #1a1a1a;
    background: #fafaf8;
  }

  img, video, iframe, aside, nav, header, footer,
  [role="banner"], [role="navigation"], [role="complementary"],
  .ad, .ads, .advertisement, .sidebar, .nav, .menu {
    display: none !important;
  }

  p { margin: 0 0 1.25em; }
  h1, h2, h3, h4 { line-height: 1.3; margin: 1.5em 0 0.5em; }
  a { color: #0055cc; }
  blockquote {
    border-left: 3px solid #ccc;
    margin: 1.5em 0;
    padding: 0.5em 1em;
    color: #555;
  }
  code, pre { font-family: 'Courier New', monospace; font-size: 0.9em; }
`;
