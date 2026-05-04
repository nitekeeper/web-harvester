// src/domain/reader/reader.ts

/** Reader display settings for font size, line height, and layout. */
export interface ReaderSettings {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly maxWidth: number;
  readonly theme: 'auto' | 'light' | 'dark' | 'sepia';
  readonly fontFamily: string;
  readonly showHighlights: boolean;
}

/** Extracted content from a reader-mode article. */
export interface ReaderContent {
  readonly content: string;
  readonly title?: string;
  readonly author?: string;
  readonly published?: string;
  readonly domain?: string;
  readonly wordCount?: number;
}

/**
 * Returns the default reader settings.
 */
export function defaultReaderSettings(): ReaderSettings {
  return {
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 38,
    theme: 'auto',
    fontFamily: 'default',
    showHighlights: true,
  };
}

/**
 * Parses a reader page URL of the form:
 *   chrome-extension://<id>/reader.html?url=<encoded-article-url>
 * Returns the decoded article URL, or null if the param is absent or the
 * string is not a valid URL.
 */
export function parseReaderUrl(url: string): { articleUrl: string } | null {
  try {
    const parsed = new URL(url);
    const articleUrl = parsed.searchParams.get('url');
    if (!articleUrl) return null;
    return { articleUrl };
  } catch {
    return null;
  }
}

/**
 * Formats the browser tab/page title for reader mode.
 * Returns "Article Title — Site Name" or just "Article Title".
 */
export function buildReaderTitle(title: string, siteName?: string): string {
  if (!siteName) return title;
  return `${title} — ${siteName}`;
}
