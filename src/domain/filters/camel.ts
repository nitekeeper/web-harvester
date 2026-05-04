// Camel-case filter — converts strings to camelCase.

/**
 * Convert a string to camelCase. Spaces, hyphens, and underscores are
 * treated as word separators and removed; the first letter is lower-cased.
 */
export function camel(value: string): string {
  return value
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase(),
    )
    .replace(/[\s_-]+/g, '');
}
