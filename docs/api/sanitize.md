# Sanitize API

## Overview

`sanitizeHtml` is the single approved choke-point for converting untrusted HTML
into markup the UI can safely render. It wraps DOMPurify with hardened defaults
and is the only file in `src/` allowed to import the `dompurify` package — every
other module must go through this wrapper. The restriction is enforced by
ESLint (`no-restricted-imports`) and documented in **ADR-016**.

Any code path that produces HTML for `dangerouslySetInnerHTML`,
`Element.innerHTML`, or any other DOM-rendering API must run the input through
`sanitizeHtml` first. The design doc rule "All HTML rendered in UI must pass
through DOMPurify" (Section 16) is satisfied by routing all callers through
this single function.

## Interface

### `sanitizeHtml(dirty: string): string`

```typescript
function sanitizeHtml(dirty: string): string;
```

Returns a sanitised HTML string. The returned value is safe to assign to
`innerHTML` or pass to React's `dangerouslySetInnerHTML`.

The wrapper relies on DOMPurify's library defaults, which strip:

- `<script>` tags and their contents
- inline event-handler attributes (`onclick`, `onerror`, `onload`, etc.)
- `javascript:` URLs in `href` / `src` / `xlink:href`
- `<iframe>`, `<object>`, `<embed>`, and other dangerous tags
- malformed or namespaced HTML that could yield XSS

## Usage

```typescript
import { sanitizeHtml } from '@shared/sanitize';

function PreviewPane({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
```

## Forbidden patterns

```typescript
// Forbidden — ESLint will fail on `pnpm lint`:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);

// Forbidden — bypasses sanitisation entirely:
element.innerHTML = userSuppliedHtml;
```

Both patterns are blocked statically: `no-restricted-imports` bans the
`dompurify` import outside `src/shared/sanitize.ts`, and
`eslint-plugin-security` warns on direct `innerHTML` assignment of unsanitised
input.

## Notes

- The wrapper is intentionally minimal. If a future caller needs a different
  sanitisation profile (e.g. allow MathML, restrict to plain text), add a new
  named export in `src/shared/sanitize.ts` rather than configuring DOMPurify at
  the call site. Keeping all configuration in one file preserves the
  "single choke-point" guarantee.
- `sanitizeHtml` always returns a `string`. DOMPurify's defaults
  (`RETURN_DOM: false`, `RETURN_DOM_FRAGMENT: false`) are not overridden.
- Performance: DOMPurify parses the input via the browser's HTML parser. For
  very large documents (>1 MB), consider chunking before sanitising.
