// src/presentation/content/defuddleParse.ts

import Defuddle from 'defuddle';

import { buildTurndown } from '@shared/turndown';
import type { MetaTag } from '@shared/types';

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
  readonly description?: string;
  readonly image?: string;
  readonly site?: string;
  readonly metaTags?: readonly MetaTag[];
}

/**
 * Page metadata extracted from a Defuddle parse result.
 * All string fields default to empty string; wordCount defaults to 0.
 */
export interface PageMetadata {
  readonly description: string;
  readonly author: string;
  readonly published: string;
  /** Comma-separated keywords from `<meta name="keywords">`. */
  readonly tags: string;
  readonly image: string;
  readonly site: string;
  readonly wordCount: number;
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

/**
 * Parses `doc` with Defuddle in a single pass and returns both the article
 * markdown and a {@link PageMetadata} bag with description, author, published
 * date, tags (from `<meta name="keywords">`), image, site, and word count.
 * Clones the document so the live DOM is never mutated.
 */
export function defuddleParseAll(
  doc: Document,
  url: string,
): { readonly markdown: string; readonly meta: PageMetadata } {
  const defuddle = new Defuddle(doc.cloneNode(true) as Document, { url });
  const result = defuddle.parse() as DefuddleParseResult;
  const metaTags = result.metaTags ?? [];
  const keywordsTag = metaTags.find((t) => t.name?.toLowerCase() === 'keywords');
  return {
    markdown: buildTurndown()
      .turndown(result.content ?? '')
      .trim(),
    meta: {
      description: result.description ?? '',
      author: result.author ?? '',
      published: result.published ?? '',
      tags: keywordsTag?.content ?? '',
      image: result.image ?? '',
      site: result.site ?? '',
      wordCount: result.wordCount ?? 0,
    },
  };
}
