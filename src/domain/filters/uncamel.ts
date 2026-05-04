// Uncamel filter — split camelCase / PascalCase identifiers into lowercase
// space-separated words.

/**
 * Split a camelCase or PascalCase identifier into lowercase, space-separated
 * words.
 */
export function uncamel(value: string): string {
  // Add space before any uppercase letter that follows a lowercase letter or
  // digit, then add space between consecutive uppercase letters when the
  // second is followed by a lowercase letter.
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toLowerCase();
}
