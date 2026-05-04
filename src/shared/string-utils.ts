import { MAX_FILE_NAME_LENGTH } from './constants';

// Printable filename-invalid characters. Control characters (U+0000–U+001F)
// are filtered separately via a code-point check so that no control character
// — literal or escape-built — appears in a regex source.
const INVALID_PRINTABLE = /[\\/:*?"<>|]/g;
const CONTROL_CHAR_MAX = 0x1f;
const ELLIPSIS = '...';
const REGEX_METACHAR = /[.*+?^${}()|[\]\\]/g;

function stripControlChars(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code > CONTROL_CHAR_MAX) {
      out += ch;
    }
  }
  return out;
}

/**
 * Sanitizes a string for use as a filename by stripping characters that are
 * invalid on common filesystems and control characters, trimming whitespace,
 * and truncating to a safe maximum length.
 */
export function sanitizeFileName(name: string): string {
  return stripControlChars(name)
    .replace(INVALID_PRINTABLE, '')
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH);
}

/**
 * Truncates a string to `maxLength`, appending an ellipsis when truncation
 * occurs. Returns the input unchanged when it is already short enough.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength < ELLIPSIS.length) {
    return text.slice(0, maxLength);
  }
  return text.slice(0, maxLength - ELLIPSIS.length) + ELLIPSIS;
}

/**
 * Removes all HTML tags from a string, leaving the text content. Implemented
 * as a single linear scan rather than a regex to avoid catastrophic
 * backtracking on adversarial input.
 */
export function stripHtml(html: string): string {
  let out = '';
  let inTag = false;
  for (const ch of html) {
    if (inTag) {
      if (ch === '>') inTag = false;
    } else if (ch === '<') {
      inTag = true;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Escapes regex metacharacters in a string so it can be used as a literal
 * pattern with `new RegExp()`.
 */
export function escapeRegex(str: string): string {
  return str.replace(REGEX_METACHAR, '\\$&');
}
