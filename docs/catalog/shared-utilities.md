# Shared Utilities Catalog

Functions, types, and constants in `src/shared/`. These modules have no imports from any other project layer — they are safe to import from anywhere.

---

## `src/shared/constants.ts`

Global extension constants.

| Name                   | Kind                           | Description                                                                                                                                                                                                    |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXTENSION_NAME`       | Constant (`string`)            | `'Web Harvester'` — display name of the extension.                                                                                                                                                             |
| `EXTENSION_VERSION`    | Constant (`string`)            | `'0.1.0'` — current semver version.                                                                                                                                                                            |
| `MAX_FILE_NAME_LENGTH` | Constant (`number`)            | `200` — maximum safe filename length; used by `sanitizeFileName`.                                                                                                                                              |
| `STORAGE_KEY_PREFIX`   | Constant (`string`)            | `'web-harvester:'` — prefix for all extension storage keys.                                                                                                                                                    |
| `SUPPORTED_LOCALES`    | Constant (`readonly string[]`) | Tuple of 36 locale codes supported by the extension (ar, bn, ca, cs, da, de, el, en, es, fa, fi, fr, he, hi, hu, id, it, ja, km, ko, nl, no, pl, pt, pt_BR, ro, ru, sk, sv, th, tl, tr, uk, vi, zh_CN, zh_TW). |
| `SupportedLocale`      | Type                           | Union type inferred from `SUPPORTED_LOCALES`.                                                                                                                                                                  |
| `DEFAULT_LOCALE`       | Constant (`SupportedLocale`)   | `'en'` — the canonical fallback locale.                                                                                                                                                                        |
| `RTL_LOCALES`          | Constant (`SupportedLocale[]`) | `['ar', 'fa', 'he']` — locales that require `dir="rtl"`.                                                                                                                                                       |

---

## `src/shared/string-utils.ts`

String manipulation utilities for filenames and content.

| Name                        | Kind     | Description                                                                                                                                         |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `sanitizeFileName(name)`    | Function | Strips filesystem-invalid characters (`\/:\*?"<>                                                                                                    | `), control characters (U+0000–U+001F), trims whitespace, and truncates to `MAX_FILE_NAME_LENGTH`. Returns a safe filename string. |
| `truncate(text, maxLength)` | Function | Truncates `text` to `maxLength` characters, appending `'...'` when truncation occurs. Returns input unchanged if already short enough.              |
| `stripHtml(html)`           | Function | Removes all HTML tags via a linear scan (no regex). Returns plain text content. Safe against adversarial input — no catastrophic backtracking risk. |
| `escapeRegex(str)`          | Function | Escapes regex metacharacters so `str` can be used as a literal pattern with `new RegExp()`.                                                         |

---

## `src/shared/date-utils.ts`

Date formatting, parsing, and a time seam for testing.

| Name                       | Kind     | Description                                                                                                                                                                            |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatDate(date, format)` | Function | Formats a `Date` using token vocabulary: `YYYY`, `YY`, `MM`, `M`, `DD`, `D`, `HH`, `mm`, `ss`. Tokens replaced left-to-right; non-token text is preserved. Returns a formatted string. |
| `parseDate(str)`           | Function | Parses a strict ISO 8601 string (`YYYY-MM-DD` or full datetime). Returns `Date` or `undefined` for non-ISO inputs.                                                                     |
| `now()`                    | Function | Returns `new Date()`. Wrapped for testability — callers can mock via this seam instead of patching the global.                                                                         |

---

## `src/shared/logger.ts`

Scoped logger factory.

| Name                              | Kind      | Description                                                                                                                                                                                                   |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoggerOptions`                   | Interface | `{ production?: boolean }` — controls debug/info suppression.                                                                                                                                                 |
| `Logger`                          | Interface | `{ debug, info, warn, error }` — each method accepts `(message: string, data?: unknown)`.                                                                                                                     |
| `createLogger(context, options?)` | Function  | Creates a scoped logger that prefixes all messages with `[context]`. In production mode (or when `NODE_ENV === 'production'`), `debug` and `info` are suppressed; `warn` and `error` always write to console. |

---

## `src/shared/types.ts`

Shared data shapes used across domain, application, and presentation layers. No imports — safe to use from any layer.

| Name             | Kind      | Description                                                                                                                                                                             |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TemplateConfig` | Interface | Data shape for a clip template: `id`, `name`, `frontmatterTemplate`, `bodyTemplate`, `noteNameTemplate`. Covers both the built-in default (`id: 'default'`) and user-created templates. |

---

## `src/shared/sanitize.ts`

HTML sanitisation choke-point — the single sanctioned consumer of DOMPurify.

| Name                  | Kind     | Description                                                                                                                                                                                                                                                                                                        |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sanitizeHtml(dirty)` | Function | Sanitises an untrusted HTML string for safe rendering. Wraps `DOMPurify.sanitize` with hardened defaults: strips `<script>`, inline event handlers, and `javascript:` URLs. All UI code that renders untrusted HTML must route through this function — direct dompurify imports are banned by ESLint. See ADR-016. |
