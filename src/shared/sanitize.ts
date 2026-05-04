import DOMPurify from 'dompurify';

/**
 * Sanitises an untrusted HTML string for safe rendering in the UI.
 *
 * This is the single approved choke-point for turning untrusted HTML into
 * markup the UI can render. All callers that need to assign or render HTML
 * (e.g. `dangerouslySetInnerHTML`, `Element.innerHTML`) must route the input
 * through this function — direct use of `DOMPurify` elsewhere is banned by
 * ESLint (`no-restricted-imports`). Centralising the call keeps the
 * configuration auditable and ensures every render gets the same hardened
 * defaults: `<script>` tags, inline event handlers, and `javascript:` URLs
 * are stripped.
 *
 * Returns a sanitised HTML string. Always returns a `string` even when
 * DOMPurify's underlying call would yield a non-string for non-string input.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}
