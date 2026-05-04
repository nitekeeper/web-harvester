// Lower-case filter — locale-aware string lowercasing.

/**
 * Lowercase the input string using locale-aware semantics.
 */
export function lower(value: string): string {
  return value.toLocaleLowerCase();
}
