// Upper-case filter — locale-aware string uppercasing.

/**
 * Uppercase the input string using locale-aware semantics.
 */
export function upper(value: string): string {
  return value.toLocaleUpperCase();
}
