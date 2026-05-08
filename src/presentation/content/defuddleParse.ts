// src/presentation/content/defuddleParse.ts

import Defuddle from 'defuddle';

import { buildTurndown } from '@shared/turndown';

/**
 * Parses `doc` with Defuddle (browser bundle) and returns the extracted
 * article body as GFM Markdown.
 */
export function defuddleParse(doc: Document, url: string): string {
  const defuddle = new Defuddle(doc.cloneNode(true) as Document, { url });
  const result = defuddle.parse();
  return buildTurndown()
    .turndown(result.content ?? '')
    .trim();
}
