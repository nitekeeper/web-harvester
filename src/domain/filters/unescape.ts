// Unescape filter — convert literal \" and \n escape sequences into their
// actual characters.

/**
 * Replace escaped quote sequences (`\"`) and escaped newlines (`\n`) with
 * their literal characters.
 */
export function unescape(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\n/g, '\n');
}
