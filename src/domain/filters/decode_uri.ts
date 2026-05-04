// Decode-URI filter — decode percent-encoded URI components.

/**
 * Decode a percent-encoded URI component. Returns the input unchanged when
 * decoding fails (e.g. malformed escape sequence).
 */
export function decode_uri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
