// Safe-name filter — sanitize a string for use as a filename across
// Windows / Mac / Linux. Chooses the conservative intersection by default
// or per-OS rules when an `os` param is provided.
//
// The control-character ranges (`\x00-\x1F`) are deliberately part of the
// removal sets — filenames must not contain ASCII control characters, so the
// `no-control-regex` / `sonarjs/sonar-no-control-regex` rules are suppressed
// for those character classes.

/* eslint-disable no-control-regex, sonarjs/sonar-no-control-regex, sonarjs/slow-regex, security/detect-unsafe-regex */

const RESERVED_WINDOWS = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
const WINDOWS_ILLEGAL = /[<>:"/\\|?*\x00-\x1F]/g;
const MAC_ILLEGAL = /[/:\x00-\x1F]/g;
const LINUX_ILLEGAL = /[/\x00-\x1F]/g;
const TRAILING_SPACE_OR_DOT = /[\s.]+$/;
const LEADING_DOT = /^\./;

function applyWindows(str: string): string {
  return str
    .replace(WINDOWS_ILLEGAL, '')
    .replace(RESERVED_WINDOWS, '_$1$2')
    .replace(TRAILING_SPACE_OR_DOT, '');
}

function applyMac(str: string): string {
  return str.replace(MAC_ILLEGAL, '').replace(LEADING_DOT, '_');
}

function applyLinux(str: string): string {
  return str.replace(LINUX_ILLEGAL, '').replace(LEADING_DOT, '_');
}

function applyDefault(str: string): string {
  return str
    .replace(WINDOWS_ILLEGAL, '')
    .replace(RESERVED_WINDOWS, '_$1$2')
    .replace(TRAILING_SPACE_OR_DOT, '')
    .replace(LEADING_DOT, '_');
}

function sanitizeForOs(str: string, os: string): string {
  switch (os) {
    case 'windows':
      return applyWindows(str);
    case 'mac':
      return applyMac(str);
    case 'linux':
      return applyLinux(str);
    default:
      return applyDefault(str);
  }
}

/**
 * Sanitize a string for use as a filename. The optional `param` selects an
 * OS-specific rule set (`windows`, `mac`, `linux`); without it, the most
 * conservative intersection is applied. Always strips special
 * characters (`#|^[]`), removes leading periods, truncates to 245
 * characters, and falls back to `Untitled` if the result would be empty.
 */
export function safe_name(value: string, param?: string): string {
  const os = param ? param.toLowerCase().trim() : 'default';
  let sanitized = value.replace(/[#|^[\]]/g, '');
  sanitized = sanitizeForOs(sanitized, os);
  sanitized = sanitized.replace(/^\.+/, '').slice(0, 245);
  return sanitized.length === 0 ? 'Untitled' : sanitized;
}
