// Kebab-case filter — converts strings to kebab-case.

/**
 * Convert a string to kebab-case (lowercase, hyphen-separated).
 */
export function kebab(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
