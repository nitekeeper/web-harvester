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

/** Shape of the Defuddle parse result fields we consume. */
interface DefuddleParseResult {
  readonly content: string;
  readonly title?: string;
  readonly author?: string;
  readonly published?: string;
  readonly domain?: string;
  readonly wordCount?: number;
}

/**
 * Extracted article content and metadata returned by {@link defuddleExtract}.
 */
export interface ExtractResult {
  readonly content: string;
  readonly title: string;
  readonly author: string;
  readonly published: string;
  readonly domain: string;
  readonly wordCount: number;
}

/**
 * Extracts article content from `doc` using Defuddle and returns the raw HTML
 * result with metadata. Clones the document internally so the live DOM is
 * never mutated.
 */
export function defuddleExtract(doc: Document, url: string): ExtractResult {
  const defuddle = new Defuddle(doc.cloneNode(true) as Document, { url });
  const result = defuddle.parse() as DefuddleParseResult;
  return {
    content: result.content ?? '',
    title: result.title ?? '',
    author: result.author ?? '',
    published: result.published ?? '',
    domain: result.domain ?? '',
    wordCount: result.wordCount ?? 0,
  };
}
