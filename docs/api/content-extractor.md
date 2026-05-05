# Content Extractor

## Overview

`content-extractor.ts` exposes two public functions:

- `extractContent` — converts a live browser `Document` into a GFM Markdown string. It clones the
  body to avoid mutating the page, applies XPath-based include/exclude filters, absolutizes
  relative URLs, and delegates HTML-to-Markdown conversion to TurndownService with the GFM plugin.
- `turndownHtml` — converts a raw HTML string to Markdown using the same TurndownService config.
  Safe to call from any execution context (e.g. background service worker) because it does not
  require a live `Document`.

## Interface

### `extractContent(doc: Document, options: ExtractionOptions): ExtractionResult`

Runs the full extraction pipeline and returns an `ExtractionResult`.

**Pipeline steps:**

1. Clone `<body>` into a detached `Document` (avoids mutating the live DOM).
2. Remove elements matching `excludedXPaths` (each XPath that resolves to nothing is skipped).
3. When `includedXPaths` is non-empty, prune everything under `<body>` except matched elements,
   their descendants, and their ancestors up to `<body>`.
4. Absolutize relative `src`, `href`, and `srcset` attributes against `options.baseUrl`.
5. Convert the resulting HTML to Markdown via TurndownService + GFM plugin (ATX headings, fenced
   code blocks, dash bullets).
6. Extract `title` from `document.title`, falling back to the first `<h1>` text.
7. Extract `byline` from `<meta name="author">` or `<meta property="article:author">`.

---

### `ExtractionOptions`

```typescript
interface ExtractionOptions {
  readonly excludedXPaths?: readonly string[];
  readonly includedXPaths?: readonly string[];
  readonly baseUrl: string;
}
```

| Field            | Required | Description                                                                             |
| ---------------- | -------- | --------------------------------------------------------------------------------------- |
| `excludedXPaths` | No       | Elements matching these XPaths are removed from the clone before conversion.            |
| `includedXPaths` | No       | When non-empty, only elements matching these XPaths (and their ancestors) are retained. |
| `baseUrl`        | Yes      | Base URL used when absolutizing relative `src`, `href`, and `srcset` attributes.        |

---

### `ExtractionResult`

```typescript
interface ExtractionResult {
  readonly markdown: string;
  readonly title: string;
  readonly byline: string | undefined;
}
```

| Field      | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| `markdown` | GFM-formatted Markdown body produced by Turndown.                                         |
| `title`    | Document title (`document.title`), falling back to the first `<h1>` text content.         |
| `byline`   | Author from `<meta name="author">` or `<meta property="article:author">`, or `undefined`. |

### `turndownHtml(html: string): string`

Converts an HTML string to Markdown using the same `TurndownService` configuration as
`extractContent` (ATX headings, dash bullets, fenced code blocks, GFM plugin). The result is
trimmed.

Use this in contexts where only the post-extraction body HTML is available (e.g. the
`TemplatePlugin.beforeClip` handler in the background service worker, where there is no live
`Document`).

## Usage Example

```typescript
import { extractContent, turndownHtml } from '@domain/extractor/content-extractor';

// Full pipeline against a live document.
const result = extractContent(document, {
  baseUrl: 'https://example.com/article',
  excludedXPaths: ['/html/body/div[@id="sidebar"]'],
  includedXPaths: ['/html/body/article'],
});

console.log(result.title); // "My Article Title"
console.log(result.byline); // "Jane Smith" | undefined
console.log(result.markdown); // "# My Article Title\n\nContent…"

// HTML-string-only conversion (no Document required).
const md = turndownHtml('<h1>Hello</h1><p>World</p>');
console.log(md); // "# Hello\n\nWorld"
```
