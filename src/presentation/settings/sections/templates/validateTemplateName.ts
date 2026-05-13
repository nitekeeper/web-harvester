/** Result of validating a template name. */
type NameValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'empty' | 'duplicate' };

/**
 * Validates a template name against an existing name list.
 *
 * Callers must pre-filter `existingNames` to exclude the template being
 * renamed so it can keep its current name without triggering a duplicate
 * error. Case-insensitive comparison is used for all duplicate checks.
 *
 * @param name - The candidate name to validate.
 * @param existingNames - Names already in use (excluding the template being renamed, if any).
 * @returns A {@link NameValidationResult} indicating success or the failure reason.
 */
export function validateTemplateName(
  name: string,
  existingNames: readonly string[],
): NameValidationResult {
  if (!name.trim()) return { valid: false, reason: 'empty' };
  const lower = name.trim().toLowerCase();
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === lower);
  if (isDuplicate) return { valid: false, reason: 'duplicate' };
  return { valid: true };
}
