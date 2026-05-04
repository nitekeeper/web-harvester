// Pascal-case filter — converts strings to PascalCase.

/**
 * Convert a string to PascalCase. Spaces, hyphens, and underscores are
 * treated as word separators and removed; each word's first letter is
 * upper-cased.
 */
export function pascal(value: string): string {
  return (
    value
      // eslint-disable-next-line sonarjs/slow-regex
      .replace(/[\s_-]+(.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^(.)/, (c: string) => c.toUpperCase())
  );
}
