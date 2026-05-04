// Snake-case filter — converts strings to snake_case.

/**
 * Convert a string to snake_case (lowercase, underscore-separated).
 */
export function snake(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}
