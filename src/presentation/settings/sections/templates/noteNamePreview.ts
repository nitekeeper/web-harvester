import dayjs from 'dayjs';

/** Fixture web page used to render live note-name pattern previews. */
export interface FixturePage {
  readonly title: string;
  readonly date: string;
  readonly url: string;
  readonly domain: string;
}

/** The fixture page used for live note-name previews in the editor. */
export const FIXTURE_PAGE: FixturePage = {
  title: 'How attention became the new currency',
  date: '2026-05-09',
  url: 'https://craftedviews.io/how-attention-became-the-new-currency',
  domain: 'craftedviews.io',
};

/** Converts a string to a filename-safe slug. */
function toSafeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Resolves a note-name pattern string against the fixture page, substituting
 * the supported tokens. Unrecognised tokens are left unchanged so the user can
 * see them in the preview without error.
 */
export function resolveNoteNamePattern(pattern: string, page: FixturePage): string {
  return pattern
    .replace(/\{\{date\|date:([^}]+)\}\}/g, (_, fmt: string) => dayjs(page.date).format(fmt))
    .replace(/\{\{date\}\}/g, page.date)
    .replace(/\{\{title\|safe_name\}\}/g, toSafeName(page.title))
    .replace(/\{\{title\}\}/g, page.title)
    .replace(/\{\{url\}\}/g, page.url)
    .replace(/\{\{domain\}\}/g, page.domain);
}

/** Printable characters that are illegal in filenames on Windows, macOS, and Linux. */
const ILLEGAL_PRINTABLE_CHARS_RE = /[<>:"/\\|?*]/;

/**
 * Returns `true` if the resolved filename contains characters that would be
 * rejected by the host operating system. Checks both printable illegal chars
 * and ASCII control characters (code points 0–31).
 */
export function hasIllegalFilenameChars(name: string): boolean {
  if (ILLEGAL_PRINTABLE_CHARS_RE.test(name)) {
    return true;
  }
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code >= 0 && code <= 31) {
      return true;
    }
  }
  return false;
}
