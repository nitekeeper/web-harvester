/**
 * Extracts a human-readable string from an unknown thrown value.
 * For `Error` instances returns `err.message`; for anything else returns `String(err)`.
 */
export function normalizeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
