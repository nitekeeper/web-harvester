import { defaultReaderSettings, type ReaderSettings } from './reader';

/** Color palette for a specific theme variant. */
interface ThemePalette {
  readonly bg: string;
  readonly fg: string;
  readonly link: string;
  readonly blockquoteFg: string;
  readonly blockquoteBorder: string;
}

const LIGHT: ThemePalette = {
  bg: '#fafaf8',
  fg: '#1a1a1a',
  link: '#0066cc',
  blockquoteFg: '#666666',
  blockquoteBorder: '#cccccc',
};

const DARK: ThemePalette = {
  bg: '#1e1e1e',
  fg: '#dadada',
  link: '#6fb3f2',
  blockquoteFg: '#aaaaaa',
  blockquoteBorder: '#555555',
};

const SEPIA: ThemePalette = {
  bg: '#f4ecd8',
  fg: '#3d2b1f',
  link: '#8b4513',
  blockquoteFg: '#7a5c40',
  blockquoteBorder: '#c4a882',
};

function buildPaletteRules(p: ThemePalette, fontStack: string): string {
  return `body,html{margin:0;padding:0;background:${p.bg}}
#wh-reader-content{max-width:var(--wh-reader-max-width,38em);margin:0 auto;padding:2rem 1rem;font-family:${fontStack};font-size:var(--wh-reader-font-size,16px);line-height:var(--wh-reader-line-height,1.6);color:${p.fg};background:${p.bg}}
#wh-reader-header{margin-bottom:2rem}
#wh-reader-title{font-size:2em;line-height:1.2;margin:0 0 0.5rem}
#wh-reader-byline{color:${p.blockquoteFg};margin:0}
#wh-reader-article p{margin:0 0 1.25em}
#wh-reader-article h1,#wh-reader-article h2,#wh-reader-article h3,#wh-reader-article h4{line-height:1.3;margin:1.5em 0 0.5em}
#wh-reader-article a{color:${p.link}}
#wh-reader-article blockquote{border-left:3px solid ${p.blockquoteBorder};margin:1.5em 0;padding:0.5em 1em;color:${p.blockquoteFg}}
#wh-reader-article code,#wh-reader-article pre{font-family:'Courier New',monospace;font-size:0.9em}
#wh-reader-article img{max-width:100%;height:auto}`;
}

/**
 * Generates theme-aware reader CSS based on the supplied settings.
 * Font size, line height, and max width are applied as CSS custom properties
 * on `documentElement` by the content script; this function generates the
 * structural and color rules only.
 */
export function generateReaderCSS(settings: ReaderSettings): string {
  const fontStack =
    settings.fontFamily === 'default' ? "Georgia,'Times New Roman',serif" : settings.fontFamily;

  if (settings.theme === 'dark') return buildPaletteRules(DARK, fontStack);
  if (settings.theme === 'sepia') return buildPaletteRules(SEPIA, fontStack);

  const base = buildPaletteRules(LIGHT, fontStack);
  if (settings.theme === 'light') return base;

  const darkOverrides = `@media (prefers-color-scheme: dark){body,html{background:${DARK.bg}}#wh-reader-content{color:${DARK.fg};background:${DARK.bg}}#wh-reader-byline{color:${DARK.blockquoteFg}}#wh-reader-article a{color:${DARK.link}}#wh-reader-article blockquote{border-left-color:${DARK.blockquoteBorder};color:${DARK.blockquoteFg}}}`;
  return base + '\n' + darkOverrides;
}

/** @deprecated Use generateReaderCSS(defaultReaderSettings()) directly. */
export const READER_CSS = generateReaderCSS(defaultReaderSettings());
