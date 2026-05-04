// src/domain/reader/reader-transcript.ts

// CJK-aware text boundary helpers
// Ported from src/utils/reader-transcript.ts

const CJK_SENT_END_RE = /[。！？]/;
const CJK_PUNCT_RE = /[。！？、，]/;
const CJK_CHAR_RE =
  /[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/**
 * Returns true when the character at `punctPos` ends a sentence.
 * For ASCII punctuation (.!?) the following character must be whitespace or
 * end-of-string. CJK sentence-ending punctuation is always a boundary.
 */
export function isSentenceBoundary(text: string, punctPos: number, nextPos: number): boolean {
  const ch = text.charAt(punctPos);
  if (ch === '') return false;
  if (CJK_SENT_END_RE.test(ch)) return true;
  if (/[.!?]/.test(ch)) {
    if (nextPos >= text.length) return true;
    return /\s/.test(text.charAt(nextPos));
  }
  return false;
}

/**
 * Returns true when the character at `punctPos` is a sentence or soft-stop
 * boundary (commas, CJK punctuation).
 */
export function isSoftBoundary(text: string, punctPos: number, nextPos: number): boolean {
  const ch = text.charAt(punctPos);
  if (ch === '') return false;
  if (CJK_PUNCT_RE.test(ch)) return true;
  if (/[.!?,]/.test(ch)) {
    if (nextPos >= text.length) return true;
    return /\s/.test(text.charAt(nextPos));
  }
  return false;
}

/**
 * Returns true when `pos` represents a word boundary in CJK-aware text.
 * In CJK text, each character is its own word.
 */
export function isWordBoundary(text: string, pos: number): boolean {
  const ch = text.charAt(pos);
  if (ch === '') return false;
  if (CJK_CHAR_RE.test(ch)) return true;
  if (pos > 0) {
    const prev = text.charAt(pos - 1);
    if (CJK_CHAR_RE.test(prev) && !CJK_CHAR_RE.test(ch) && /\S/.test(ch)) {
      return true;
    }
  }
  return false;
}
