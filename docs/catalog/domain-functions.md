# Domain Functions Catalog

Functions, classes, and types in `src/domain/`. Includes everything in `src/types/` (re-exports from domain).

---

## `src/domain/types.ts`

Core plugin-system interfaces for the micro-kernel.

| Name              | Kind       | Description                                                                                                                                        |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IHookSystem`     | Interface  | Index-signature placeholder for the hook map; concrete version in `src/core/hooks.ts`.                                                             |
| `IPluginManifest` | Interface  | Static plugin metadata: `id`, `name`, `version`, `dependencies`, `requiredAdapters`, `permissions`, `settingsSchema`.                              |
| `IPluginSchema`   | Interface  | Versioned settings schema with a `migrations` record (`version → (oldState) => newState`).                                                         |
| `IPluginStorage`  | Interface  | Per-plugin namespaced key/value storage: `get<T>`, `set<T>`, `remove`, `clear`.                                                                    |
| `ILogger`         | Type alias | Scoped logger: `debug`, `info`, `warn`, `error`. Type alias of `Logger` from `@shared/logger` — single source of truth for the logger contract.    |
| `UISlot`          | Type       | Union of named popup/settings extension points: `'popup-toolbar' \| 'popup-properties' \| 'popup-footer' \| 'settings-section' \| 'settings-nav'`. |
| `UIContext`       | Type       | Top-level UI surfaces: `'popup' \| 'settings' \| 'side-panel'`.                                                                                    |
| `IUIComponent`    | Interface  | A renderable component contribution with `id`, `component`, and `priority`.                                                                        |
| `IUIRegistry`     | Interface  | Plugin-facing registry for contributing UI slots, components, and theme tokens.                                                                    |
| `IPluginContext`  | Interface  | Runtime services injected into a plugin during activation: `hooks`, `container`, `logger`, `storage`, `ui`.                                        |
| `IPlugin`         | Interface  | Plugin contract: `manifest`, `activate(context)`, `deactivate()`.                                                                                  |

---

## `src/domain/extractor/content-extractor.ts`

High-level content extraction pipeline: clones the live DOM, applies XPath filters, absolutizes URLs, and converts to GFM Markdown via Turndown.

| Name                           | Kind      | Description                                                                                                                                                                                                                      |
| ------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExtractionOptions`            | Interface | Options for `extractContent`: `excludedXPaths?` (elements to remove), `includedXPaths?` (elements to retain; everything else is pruned), `baseUrl` (used when absolutizing relative URLs).                                       |
| `ExtractionResult`             | Interface | Output of `extractContent`: `markdown` (GFM body string), `title` (document title or first `<h1>`), `byline` (author meta value, or `undefined`).                                                                                |
| `extractContent(doc, options)` | Function  | Runs the full extraction pipeline on a `Document`: clone `<body>` → remove excluded XPaths → filter to included XPaths → absolutize URLs → Turndown GFM conversion → extract title → extract byline. Returns `ExtractionResult`. |

---

## `src/domain/extractor/dom-utils.ts`

Low-level DOM helpers used by the article extractor (XPath, safe HTML mutation, serialization, and URL absolutization).

| Name                            | Kind     | Description                                                                                                                                                                                                                                       |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getElementXPath(element)`      | Function | Generates a unique XPath string for a DOM node by walking the parent chain. Each segment is `tagname[n]` where `n` is the 1-based index among same-tag siblings.                                                                                  |
| `getElementByXPath(xpath, doc)` | Function | Resolves an XPath expression against the given `Document` using `document.evaluate`. Returns the first matching `Element`, or `null` when no match is found.                                                                                      |
| `setElementHTML(element, html)` | Function | Safely replaces an element's children by parsing `html` through `DOMParser` and calling `replaceChildren`. Avoids direct `innerHTML` assignment.                                                                                                  |
| `serializeChildren(element)`    | Function | Serialises an element's child nodes to an HTML string: element children via `outerHTML`, text nodes HTML-escaped (`&`, `<`, `>`), comment nodes preserved as `<!--…-->`.                                                                          |
| `absolutizeUrls(html, baseUrl)` | Function | Converts relative URLs in `src`, `href`, and `srcset` attributes to absolute against `baseUrl`. Handles `srcset` candidate lists with descriptors; skips values starting with `http`, `data:`, `#`, `//`. Returns the rewritten body `innerHTML`. |

---

## `src/domain/extractor/flatten-shadow-dom.ts`

### `flattenShadowDom(doc: Document): void`

Kind: pure synchronous DOM transformation
File: `src/domain/extractor/flatten-shadow-dom.ts`
Walks the entire DOM tree rooted at `doc`, finds elements with shadow roots, and replaces each shadow host's light-DOM children with a `<div data-clip-shadow="true">` wrapper containing the shadow root's serialized innerHTML. Recurses into nested shadow roots bottom-up before lifting. Closed shadow roots (`mode: 'closed'`) are silently skipped (they return `null` from `node.shadowRoot`). No external dependencies.

---

## `src/domain/filters/index.ts`

Pluggable filter registry used by the template renderer. Re-exports `createFilterRegistry`, `FilterFn`, and `IFilterRegistry` from `registry.ts`; adds `createPopulatedFilterRegistry` which registers all 41 built-in filters.

| Name                            | Kind      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IFilterRegistry`               | Interface | Single method `apply(filterName, value, args)` — applies a named filter and returns the transformed string.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `FilterFn`                      | Type      | `(value: string, ...args: string[]) => string` — signature every filter function must conform to.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `createFilterRegistry`          | Function  | Returns an empty `IFilterRegistry`. Consumers register filters manually via the returned object.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `createPopulatedFilterRegistry` | Function  | Returns an `IFilterRegistry` with all 41 built-in filters pre-registered. Used by `compileTemplate()`. Individual filter names: `blockquote`, `calc`, `callout`, `camel`, `capitalize`, `date`, `date_modify`, `decode_uri`, `duration`, `first`, `footnote`, `fragment_link`, `join`, `kebab`, `last`, `length`, `link`, `list`, `lower`, `map`, `merge`, `nth`, `number_format`, `object`, `pascal`, `replace`, `reverse`, `round`, `safe_name`, `slice`, `snake`, `split`, `strip_md`, `table`, `title`, `trim`, `uncamel`, `unescape`, `unique`, `upper`, `wikilink`. |

---

## `src/domain/highlighter/highlighter.ts`

Pure data types and logic for the page-highlighter feature. Live-DOM mutation, storage I/O, and event handling live in the `HighlighterPlugin` and are not represented here.

| Name                                              | Kind             | Description                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HighlightData`                                   | Interface        | Common shape: `id`, `xpath`, `content`, optional `notes`, optional `groupId`. Extended by the type-specific variants.                                                                                                            |
| `TextHighlightData`                               | Interface        | Text-range highlight: adds `type: 'text'`, `startOffset`, `endOffset`.                                                                                                                                                           |
| `ElementHighlightData`                            | Interface        | Whole-element highlight: adds `type: 'element'`. Used for block tags listed in `BLOCK_HIGHLIGHT_TAGS`.                                                                                                                           |
| `AnyHighlightData`                                | Type             | Discriminated union `TextHighlightData \| ElementHighlightData`.                                                                                                                                                                 |
| `StoredData`                                      | Interface        | Persisted bundle for one page: `highlights`, `url`, optional `title`.                                                                                                                                                            |
| `HighlightsStorage`                               | Type             | `Record<string, StoredData>` — keyed by normalized URL.                                                                                                                                                                          |
| `ExportedHighlight`                               | Interface        | Serialized highlight for export: `text`, `timestamp`, optional `notes`.                                                                                                                                                          |
| `BLOCK_HIGHLIGHT_TAGS`                            | Constant (`Set`) | Block-level tag names highlighted as a whole element: `FIGURE`, `PICTURE`, `IMG`, `TABLE`, `PRE`.                                                                                                                                |
| `EPHEMERAL_PARAMS`                                | Constant (`Set`) | URL query parameters stripped by `normalizeUrl` (utm\_\*, fbclid, gclid, mc\_\*, etc.).                                                                                                                                          |
| `normalizeUrl(url)`                               | Function         | Strips fragments and ephemeral tracking params from a URL for stable storage keys. Returns the input unchanged if not a parseable URL.                                                                                           |
| `groupHighlights(highlights)`                     | Function         | Groups highlights by `groupId` while preserving insertion order. Ungrouped highlights pass through as single-element arrays.                                                                                                     |
| `collapseGroupsForExport(highlights, transform?)` | Function         | Collapses grouped highlights into one `ExportedHighlight` per group. Joins member contents with blank lines and merges notes. Optional `transformContent` callback runs on each member's content (for HTML→Markdown conversion). |

---

## `src/domain/reader/reader.ts`

Pure data and formatting helpers for reader mode. DOM rendering, CSS injection, and sidebar UI live in the `ReaderPlugin` and are not represented here.

| Name                             | Kind      | Description                                                                                                                                                                                    |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReaderSettings`                 | Interface | Reader display settings: `fontSize`, `lineHeight`, `maxWidth`, `theme` (`'auto' \| 'light' \| 'dark' \| 'sepia'`), `fontFamily`, `showHighlights`. All fields are `readonly`.                  |
| `ReaderContent`                  | Interface | Extracted reader-mode article: required `content`, optional `title`, `author`, `published`, `domain`, `wordCount`. All fields are `readonly`.                                                  |
| `defaultReaderSettings()`        | Function  | Returns the default `ReaderSettings` (`fontSize: 16`, `lineHeight: 1.6`, `maxWidth: 38`, `theme: 'auto'`, `fontFamily: 'default'`, `showHighlights: true`).                                    |
| `parseReaderUrl(url)`            | Function  | Parses a reader page URL of the form `chrome-extension://<id>/reader.html?url=<encoded>` and returns `{ articleUrl }`. Returns `null` when the `url` param is missing or the input is invalid. |
| `buildReaderTitle(title, site?)` | Function  | Formats the browser tab/page title for reader mode. Returns `"Title — Site"` when a site name is given, otherwise the title alone. Empty `siteName` is treated as omitted.                     |

---

## `src/domain/reader/reader-transcript.ts`

CJK-aware text boundary helpers ported from `src/utils/reader-transcript.ts`. The interactive `wireTranscript` function from the original is intentionally not ported — it depends on browser DOM APIs and belongs in a presentation/plugin layer.

| Name                                          | Kind     | Description                                                                                                                                                                                           |
| --------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isSentenceBoundary(text, punctPos, nextPos)` | Function | Returns `true` when the character at `punctPos` ends a sentence. ASCII `.!?` requires whitespace or end-of-string at `nextPos`; CJK sentence-ending punctuation (`。！？`) is always a boundary.      |
| `isSoftBoundary(text, punctPos, nextPos)`     | Function | Returns `true` for sentence or soft-stop boundaries — comma (`,`), CJK soft stops (`、`, `，`), and the sentence-ending characters under the same trailing-whitespace rules as `isSentenceBoundary`.  |
| `isWordBoundary(text, pos)`                   | Function | Returns `true` when `pos` is a word boundary in CJK-aware text. Each CJK character is its own word; the position immediately after a CJK character is also a boundary if it is non-CJK and non-space. |

---

## `src/domain/i18n/i18n.ts`

Internationalisation module. Loads locale JSON bundles at runtime via Vite's `import.meta.glob`, formats ICU-style messages, and tracks the active locale. English is lazy-loaded as a fallback for non-English locales.

| Name                         | Kind     | Description                                                                                                                                                            |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPPORTED_LOCALES`          | Constant | Re-exported from `@shared/constants` — 36 locale codes.                                                                                                                |
| `SupportedLocale`            | Type     | Re-exported from `@shared/constants` — union of supported locale code strings.                                                                                         |
| `RTL_LOCALES`                | Constant | `ReadonlySet<SupportedLocale>` containing `'ar'`, `'fa'`, `'he'`.                                                                                                      |
| `loadLocale(locale)`         | Function | Loads the JSON message bundle for `locale` and activates it. Atomically swaps state only after all awaits resolve. Falls back to English for missing entries.          |
| `formatMessage(id, values?)` | Function | Returns the formatted message string for `id` using the active locale. Substitutes `values` via `@formatjs/intl`. Returns `id` verbatim if no matching entry is found. |
| `getCurrentLocale()`         | Function | Returns the currently active `SupportedLocale`.                                                                                                                        |
| `isRTL(locale)`              | Function | Returns `true` when `locale` requires right-to-left layout (i.e. it is in `RTL_LOCALES`).                                                                              |

---

## `src/domain/template/tokenizer.ts`

Public entry point for the template tokenizer.

| Name                 | Kind             | Description                                                                                                                                   |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenize(input)`    | Function         | Tokenises a template string into a `TokenizerResult` (`{ tokens, errors }`). Non-fatal errors accumulate so callers see all problems at once. |
| `formatToken(token)` | Function         | Debug formatter: `type("value") at line:column`.                                                                                              |
| `formatError(error)` | Function         | Debug formatter for `TokenizerError`: `Error at line N, column N: message`.                                                                   |
| `Token`              | Type (re-export) | Single token with `type`, `value`, `line`, `column`, and optional `trimLeft`/`trimRight`.                                                     |
| `TokenizerError`     | Type (re-export) | Non-fatal error with `message`, `line`, `column`.                                                                                             |
| `TokenizerResult`    | Type (re-export) | `{ tokens: Token[], errors: TokenizerError[] }` — always includes both.                                                                       |
| `TokenType`          | Type (re-export) | Discriminated union of every token the tokenizer can emit (text, keywords, operators, literals, punctuation, eof).                            |

---

## `src/domain/template/tokenizer-types.ts`

Internal types and the keyword lookup table.

| Name                   | Kind      | Description                                                                                                                                            |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TokenType`            | Type      | Full union of all token type discriminants (structural, keyword, operator, literal, punctuation, eof).                                                 |
| `Token`                | Interface | A single emitted token with `type`, `value`, source position, and optional whitespace-trim flags.                                                      |
| `TokenizerError`       | Interface | Non-fatal tokenizer error with source position.                                                                                                        |
| `TokenizerResult`      | Interface | `{ tokens, errors }` returned from `tokenize`.                                                                                                         |
| `TokenizerMode`        | Type      | Current lexer mode: `'text' \| 'variable' \| 'tag'`.                                                                                                   |
| `TokenizerState`       | Interface | Mutable bookkeeping during tokenization: `input`, `pos`, `line`, `column`, `mode`, `tokens`, `errors`. Internal.                                       |
| `lookupKeyword(value)` | Function  | Resolves a lowercase identifier to its `TokenType` if it is a reserved keyword; returns `undefined` otherwise. Guards against prototype-chain lookups. |

---

## `src/domain/template/tokenizer-helpers.ts`

Low-level character helpers and cursor mutators used by the tokenizer modes.

| Name                      | Kind     | Description                                                                            |
| ------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `lookAhead(state, str)`   | Function | Returns `true` if `input` at `pos` matches `str` exactly (multi-character lookahead).  |
| `advance(state, count)`   | Function | Advances the cursor by `count` characters, updating line/column tracking for each.     |
| `advanceChar(state)`      | Function | Advances cursor by exactly one character; increments `state.line` on `\n`.             |
| `skipWhitespace(state)`   | Function | Advances past any run of whitespace (space, tab, `\n`, `\r`).                          |
| `isWhitespace(char)`      | Function | Returns `true` for ASCII whitespace characters.                                        |
| `isDigit(char)`           | Function | Returns `true` for ASCII digits 0–9.                                                   |
| `isIdentifierStart(char)` | Function | Returns `true` for characters that may begin an identifier (`a-z`, `A-Z`, `_`, `@`).   |
| `isIdentifierChar(char)`  | Function | Returns `true` for characters that may continue an identifier (adds digits, `-`, `.`). |

---

## `src/domain/template/tokenizer-literals.ts`

String, number, identifier, CSS selector, and escaped filter argument tokenization.

| Name                                 | Kind     | Description                                                                                                                                                               |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenizeString(state)`              | Function | Tokenises a quoted string literal (`'` or `"`). Handles escape sequences; emits partial token with error on unclosed string.                                              |
| `tokenizeEscapedArgument(state)`     | Function | Tokenises a backslash-escaped filter argument (runs until `\|`, `%}`, `}}`, or `)`).                                                                                      |
| `tokenizeNumber(state)`              | Function | Tokenises an integer or floating-point literal with optional leading minus.                                                                                               |
| `tokenizeIdentifier(state)`          | Function | Tokenises an identifier or keyword, dispatching to `tokenizeCssSelector` when a `selector:`/`selectorHtml:` prefix is detected.                                           |
| `tokenizeCssSelector(state, prefix)` | Function | Continues tokenising a CSS selector body after a `selector:` prefix; handles quoted strings, bracket depth, and paren depth. Returns the full selector value as a string. |

---

## `src/domain/template/tokenizer-modes.ts`

Top-level mode dispatchers: text, variable, tag, and shared expression tokenization.

| Name                              | Kind     | Description                                                                                                                                        |
| --------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenizeText(state)`             | Function | Tokenises plain text until a `{{` or `{%` opener is found.                                                                                         |
| `tokenizeVariable(state)`         | Function | Tokenises content inside `{{ ... }}` — handles `}}` close, malformed single `}`, and nested opener recovery.                                       |
| `tokenizeTag(state)`              | Function | Tokenises content inside `{% ... %}` — handles `%}` and `-%}` closes and malformed `}` recovery.                                                   |
| `tokenizeExpression(state, mode)` | Function | Tokenises a single expression element shared between variable and tag modes (literal, identifier, multi- or single-char operator, or punctuation). |

---

## `src/domain/template/parser.ts`

Public entry point for the template parser.

| Name                  | Kind                 | Description                                                                                                                                                                                                                                                                    |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parse(input)`        | Function             | Tokenises and parses a template string into a `ParserResult`. Tokenizer errors are surfaced as parser errors so callers see a single unified list.                                                                                                                             |
| `parseTokens(tokens)` | Function             | Parses a pre-tokenized `Token[]` into a `ParserResult`. Useful when the caller has already tokenised (e.g. from a cache).                                                                                                                                                      |
| `formatAST`           | Function (re-export) | Formats an AST node list into an indented multi-line string for debugging.                                                                                                                                                                                                     |
| `formatExpression`    | Function (re-export) | Formats a single expression node for debugging.                                                                                                                                                                                                                                |
| `formatParserError`   | Function (re-export) | Formats a `ParserError` with its source position.                                                                                                                                                                                                                              |
| `validateVariables`   | Function (re-export) | Walks the AST to validate variable references against preset and scope variables. Returns warnings with "Did you mean" suggestions.                                                                                                                                            |
| `levenshteinDistance` | Function (re-export) | Calculates edit distance between two strings (used for fuzzy variable-name matching).                                                                                                                                                                                          |
| All AST node types    | Types (re-exports)   | `ASTNode`, `TextNode`, `VariableNode`, `IfNode`, `ForNode`, `SetNode`, `Expression`, `LiteralExpression`, `IdentifierExpression`, `BinaryExpression`, `UnaryExpression`, `FilterExpression`, `GroupExpression`, `MemberExpression`, `BaseNode`, `ParserError`, `ParserResult`. |

---

## `src/domain/template/parser-types.ts`

AST node types and result interfaces (internal; re-exported by `parser.ts`).

| Name                   | Kind      | Description                                                                          |
| ---------------------- | --------- | ------------------------------------------------------------------------------------ |
| `BaseNode`             | Interface | Common fields for every AST node: `type` discriminant, `line`, `column`.             |
| `TextNode`             | Interface | Plain text content: `type: 'text'`, `value`.                                         |
| `VariableNode`         | Interface | `{{ expression }}` interpolation with `trimLeft`/`trimRight` flags.                  |
| `IfNode`               | Interface | `{% if %}` block with `condition`, `consequent`, `elseifs`, `alternate`.             |
| `ForNode`              | Interface | `{% for %}` loop with `iterator`, `iterable`, `body`.                                |
| `SetNode`              | Interface | `{% set %}` assignment with `variable`, `value`.                                     |
| `ASTNode`              | Type      | Discriminated union: `TextNode \| VariableNode \| IfNode \| ForNode \| SetNode`.     |
| `LiteralExpression`    | Interface | String, number, boolean, or null literal. Carries `raw` source text.                 |
| `IdentifierExpression` | Interface | Bare variable name reference, possibly with special prefix (`schema:`, `selector:`). |
| `BinaryExpression`     | Interface | Binary operation with `operator`, `left`, `right`.                                   |
| `UnaryExpression`      | Interface | Unary prefix operation (`not`/`!`) with `argument`.                                  |
| `FilterExpression`     | Interface | `value \| filter:args` application with `name` and `args`.                           |
| `GroupExpression`      | Interface | Parenthesised sub-expression.                                                        |
| `MemberExpression`     | Interface | Bracket-notation member access `object[property]`.                                   |
| `Expression`           | Type      | Discriminated union of all expression node types.                                    |
| `ParserError`          | Interface | Non-fatal error with `message`, `line`, `column`.                                    |
| `ParserResult`         | Interface | `{ ast: ASTNode[], errors: ParserError[] }`.                                         |

---

## `src/domain/template/parser-state.ts`

Parser state representation and low-level token-stream cursor helpers.

| Name                                  | Kind      | Description                                                                                               |
| ------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `ParserState`                         | Interface | Mutable parser bookkeeping: `tokens`, `pos`, `errors`. Internal.                                          |
| `peek(state)`                         | Function  | Returns the token at the current cursor without advancing. Falls back to synthetic EOF.                   |
| `advance(state)`                      | Function  | Returns the current token and advances the cursor (stays at EOF if already there).                        |
| `check(state, type)`                  | Function  | Returns `true` when the next token has the given type.                                                    |
| `isAtEnd(state)`                      | Function  | Returns `true` when the cursor is at the `eof` token.                                                     |
| `checkTagKeyword(state, ...keywords)` | Function  | Returns `true` when the next token is `tag_start` immediately followed by one of the given keyword types. |
| `consumeTagStart(state)`              | Function  | Consumes a `tag_start` token and returns it.                                                              |
| `consumeTagEnd(state)`                | Function  | Consumes a `tag_end` token or records a "missing %}" error.                                               |
| `skipToEndOfTag(state)`               | Function  | Discards tokens until a `tag_end` is consumed (error recovery).                                           |
| `skipToEndOfVariable(state)`          | Function  | Discards tokens until a `variable_end` is consumed (error recovery).                                      |

---

## `src/domain/template/parser-expressions.ts`

Operator-precedence expression chain.

| Name                               | Kind     | Description                                                                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `parseExpression(state)`           | Function | Entry point — delegates to `parseNullishExpression` (lowest precedence). Returns `Expression \| null`. |
| `parseNullishExpression(state)`    | Function | `??` coalescing (lowest precedence).                                                                   |
| `parseFilterExpression(state)`     | Function | Filter chain: `value \| filter1 \| filter2:arg`.                                                       |
| `parseOrExpression(state)`         | Function | Logical OR: `or` / `\|\|`.                                                                             |
| `parseAndExpression(state)`        | Function | Logical AND: `and` / `&&`.                                                                             |
| `parseNotExpression(state)`        | Function | Logical NOT: `not expr` / `!expr`. Right-associative.                                                  |
| `parseComparisonExpression(state)` | Function | Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`.                                    |

---

## `src/domain/template/parser-primary.ts`

Primary expression and postfix bracket-access parsing.

| Name                            | Kind     | Description                                                                                                                  |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `parsePrimaryExpression(state)` | Function | Parses the lowest-precedence atom: literal (string/number/boolean/null), identifier with optional prefix, or `(expr)` group. |
| `parsePostfixExpression(state)` | Function | Parses a primary followed by zero or more `[index]` member accesses.                                                         |

---

## `src/domain/template/parser-filter-args.ts`

Filter argument parsing.

| Name                         | Kind     | Description                                                                                                                                                                                                                 |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseFilterArgument(state)` | Function | Parses a single filter argument that may contain colon-separated ranges, arrow functions (`x => expr`), regex character classes (`[...]`), or chained quoted strings. Returns a `string` literal or raw primary expression. |

---

## `src/domain/template/parser-statements.ts`

Top-level template dispatch and variable/text parsing.

| Name                             | Kind     | Description                                                                                                                                  |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseTemplate(state)`           | Function | Iterates the token stream and produces a list of top-level `ASTNode[]`, stopping at EOF.                                                     |
| `parseBody(state, stopKeywords)` | Function | Parses zero or more nodes until one of the supplied stop keywords appears as the next tag keyword. Used for `{% if %}` / `{% for %}` bodies. |

---

## `src/domain/template/parser-control.ts`

Control-flow statement parsing (`if`, `for`, `set`).

| Name                                                        | Kind     | Description                                                                                                                         |
| ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ParseBodyFn`                                               | Type     | `(state, stopKeywords) => ASTNode[]` — the callback type injected to avoid circular imports.                                        |
| `parseIfStatement(state, startToken, trimLeft, parseBody)`  | Function | Parses an `{% if %}` block: condition, consequent, `elseif` branches, optional `else`, and `{% endif %}`. Returns `IfNode \| null`. |
| `parseForStatement(state, startToken, trimLeft, parseBody)` | Function | Parses a `{% for %}` block: `for var in iterable` header, loop body, and `{% endfor %}`. Returns `ForNode \| null`.                 |
| `parseSetStatement(state, startToken, trimLeft)`            | Function | Parses a `{% set name = value %}` tag (single-line). Returns `SetNode \| null`.                                                     |

---

## `src/domain/template/parser-format.ts`

Debug formatters for AST nodes and parser errors.

| Name                             | Kind     | Description                                                        |
| -------------------------------- | -------- | ------------------------------------------------------------------ |
| `formatAST(nodes, indent?)`      | Function | Formats an `ASTNode[]` into an indented multi-line string.         |
| `formatExpression(expr, indent)` | Function | Formats a single `Expression` into an indented multi-line string.  |
| `formatParserError(error)`       | Function | Formats a `ParserError` with `Error at line N, column N: message`. |

---

## `src/domain/template/parser-validate.ts`

Variable reference validation and fuzzy suggestion.

| Name                        | Kind     | Description                                                                                                                                                                                              |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validateVariables(ast)`    | Function | Walks an `ASTNode[]` and returns `ParserError[]` warnings for references that do not resolve to any known preset, special-prefix, `set`-defined, or loop variable. Includes "Did you mean?" suggestions. |
| `levenshteinDistance(a, b)` | Function | Computes edit distance between two strings using a `Uint16Array`-backed DP matrix. Used for fuzzy variable-name matching.                                                                                |

---

## `src/domain/template/renderer.ts`

Template renderer — evaluates an AST into string output.

| Name                                  | Kind             | Description                                                                                                                  |
| ------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AsyncResolver`                       | Type             | `(name, context) => Promise<unknown>` — resolves variables asynchronously (e.g. CSS selectors querying a tab).               |
| `RenderContext`                       | Interface        | Renderer input: `variables` record, `currentUrl`, optional `tabId`, optional `asyncResolver`, and required `filterRegistry`. |
| `RenderOptions`                       | Interface        | `trimOutput?: boolean` — whether to trim whitespace from the final output.                                                   |
| `RenderError`                         | Interface        | Non-fatal render error with optional `line`/`column`.                                                                        |
| `RenderResult`                        | Interface        | `{ output, errors, hasDeferredVariables }`.                                                                                  |
| `render(template, context, options?)` | Function         | Parses and renders a template string. Returns `RenderResult`. Async.                                                         |
| `renderAST(ast, context, options?)`   | Function         | Renders a pre-parsed `ASTNode[]` directly. Useful when the caller already has a parsed AST. Async.                           |
| `RenderState`                         | Type (re-export) | Mutable state threaded through the renderer (from `renderer-eval.ts`).                                                       |

---

## `src/domain/template/renderer-eval.ts`

Expression evaluation and variable resolution helpers.

| Name                              | Kind      | Description                                                                                                                            |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `RenderState`                     | Interface | Mutable renderer bookkeeping: `context`, `errors`, `pendingTrimRight`, `hasDeferredVariables`.                                         |
| `evaluateExpression(expr, state)` | Function  | Evaluates an `Expression` node against the current render state. Dispatches to specialized evaluators. Async.                          |
| `isTruthy(value)`                 | Function  | Truthy check with Twig semantics: `undefined`/`null`/`''`/`0`/`false`/`[]` are falsy.                                                  |
| `valueToString(value)`            | Function  | Converts any value to string for output. Single-element primitive arrays unwrap; objects serialise as JSON; `null`/`undefined` → `''`. |

---

## `src/domain/template/renderer-schema.ts`

Schema variable resolution helpers for the template renderer.

| Name                                     | Kind      | Description                                                                                                                                                                                             |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NestedArrayKey`                         | Interface | Parsed components of a `key[*].prop` or `key[0].prop` schema path: `arrayKey`, `indexOrStar`, `propertyPath`.                                                                                           |
| `resolveSchemaVariable(name, variables)` | Function  | Resolves a `schema:` variable with shorthand support — e.g. `schema:genre` can match a stored `{{schema:@Movie.genre}}` key. Handles nested-array indexing and JSON-string parsing.                     |
| `parseNestedArrayKey(schemaKey)`         | Function  | Parses a `key[*].prop` or `key[0].prop` schema key into a `NestedArrayKey`. Returns `null` when the key does not match the pattern.                                                                     |
| `parseSchemaValue(value)`                | Function  | If `value` is a JSON-encoded string starting with `[` or `{`, parses and returns it; otherwise returns the value unchanged.                                                                             |
| `getNestedValue(obj, path)`              | Function  | Walks a dotted (and optionally bracketed) property path on an object or array, returning the resolved value or `undefined`. Shared between schema lookups and plain identifier dot-notation resolution. |

---

## `src/domain/template/renderer-whitespace.ts`

Whitespace trimming helpers for Twig-style `{%- -%}` markers.

| Name                                                | Kind     | Description                                                                                                                                                                                                                                 |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trimTrailingWhitespace(str)`                       | Function | Strips trailing tabs/spaces and an optional trailing CRLF/LF from a string. Used for `trimLeft` handling — removes whitespace at the end of previous accumulated output.                                                                    |
| `trimLeadingWhitespace(str)`                        | Function | Strips leading tabs/spaces and an optional following CRLF/LF from a string. Used for `trimRight` handling — removes whitespace at the start of the next node's output.                                                                      |
| `appendNodeOutput(output, nodeOutput, node, state)` | Function | Appends a rendered node's output to the accumulated string. Applies `trimLeft` (trim trailing whitespace from `output`) and `trimRight` (trim leading whitespace from `nodeOutput`) based on the node's flags and `state.pendingTrimRight`. |

---

## `src/domain/template/compiler.ts`

Public entry point that composes the full template pipeline (tokenizer → parser → renderer + filter registry). Consumers should call `compileTemplate()` rather than invoking the three stages separately.

| Name                                   | Kind      | Description                                                                                                                                                             |
| -------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TemplateVariables`                    | Interface | `Record<string, unknown>` — variable bag passed into the template at render time.                                                                                       |
| `CompileError`                         | Interface | `{ message: string; line?: number; column?: number }` — a single parse or render error.                                                                                 |
| `CompileResult`                        | Interface | `{ frontmatter: string; body: string; errors: CompileError[] }` — compiled output split into YAML frontmatter and body. Errors are returned in-band rather than thrown. |
| `compileTemplate(template, variables)` | Function  | Async. Tokenizes, parses, and renders a template string. Returns `Promise<CompileResult>` (frontmatter + body + errors); errors are returned in-band.                   |

---

## `src/domain/template/index.ts`

Barrel re-export of the full template engine public API. Import from here rather than from individual sub-modules.

| Name                                                             | Re-exported from     |
| ---------------------------------------------------------------- | -------------------- |
| `compileTemplate`                                                | `template/compiler`  |
| `TemplateVariables`                                              | `template/compiler`  |
| `CompileResult`                                                  | `template/compiler`  |
| `CompileError`                                                   | `template/compiler`  |
| `render`, `renderAST`                                            | `template/renderer`  |
| `RenderContext`, `RenderResult`, `AsyncResolver`, `RenderedNode` | `template/renderer`  |
| `parse`, `parseTokens`                                           | `template/parser`    |
| `tokenize`, `formatToken`, `formatError`                         | `template/tokenizer` |

---

## `src/domain/templates/defaultTemplate.ts`

Built-in fallback template returned by `TemplateService.getDefault()` when no user templates are stored.

| Name               | Kind     | Description                                                                                                                                                                                                               |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_TEMPLATE` | Constant | `TemplateConfig` (from `@shared/types`) with `id: 'default'`, `name: 'Default'`. Frontmatter includes `title`, `url`, `date`. Body is `{{content}}`. Note name pattern: `{{date\|date:YYYY-MM-DD}} {{title\|safe_name}}`. |

---

## `src/types/index.ts`

Cross-cutting shared types (re-exports domain types plus two utility types).

| Name             | Kind       | Description                                                                                                                                                                                                                      |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Result<T, E>`   | Type       | Discriminated-union result type: `{ ok: true; value: T } \| { ok: false; error: E }`.                                                                                                                                            |
| `Maybe<T>`       | Type       | `T \| undefined`.                                                                                                                                                                                                                |
| All domain types | Re-exports | Re-exports all plugin-system interfaces from `@domain/types`: `IHookSystem`, `IPlugin`, `IPluginContext`, `IPluginManifest`, `IPluginSchema`, `IPluginStorage`, `ILogger`, `IUIComponent`, `IUIRegistry`, `UIContext`, `UISlot`. |
