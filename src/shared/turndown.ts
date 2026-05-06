import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/** Constructs a TurndownService configured for GFM output (atx headings, fenced code, dashes for `<hr>`). */
export function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    hr: '---',
    strongDelimiter: '**',
    emDelimiter: '*',
  });
  td.use(gfm);
  return td;
}
