# Filter Registry API

## Overview

The filter registry is the pluggable filter surface used by the template renderer. It maps
filter names (e.g. `lower`, `date`, `safe_name`) to string transformation functions. The
renderer calls `apply` when it encounters a pipe expression such as `{{ value | lower }}`.
Unknown filter names pass the value through unchanged, making composition defensive.

## Interface

### `IFilterRegistry`

#### `apply(filterName: string, value: string, args: string[]): string`

Applies the named filter to `value` with the given positional `args`. Returns the transformed
string. If `filterName` is not recognised, `value` is returned unchanged.

---

### `FilterFn`

```typescript
type FilterFn = (value: string, ...args: string[]) => string;
```

Signature every filter function must conform to. Positional filter arguments (e.g.
`{{ date | date:YYYY-MM-DD }}` → `args = ['YYYY-MM-DD']`) are passed as rest parameters.

---

## Factory Functions

### `createFilterRegistry(): IFilterRegistry`

Returns an **empty** `IFilterRegistry`. Useful when you want to register only a specific
subset of filters manually.

---

### `createPopulatedFilterRegistry(): IFilterRegistry`

Returns an `IFilterRegistry` with all 41 built-in filters pre-registered. This is what
`compileTemplate()` uses internally — prefer this over the empty registry for standard
template rendering.

#### Built-in filters

| Name            | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `blockquote`    | Wraps each line with `>` Markdown blockquote prefix                   |
| `calc`          | Evaluates a basic arithmetic expression (`+`, `-`, `*`, `/`)          |
| `callout`       | Wraps content in an callout block                                     |
| `camel`         | Converts to camelCase                                                 |
| `capitalize`    | Uppercases the first character                                        |
| `date`          | Formats a date string using dayjs format tokens                       |
| `date_modify`   | Adds or subtracts a duration from a date (e.g. "+1 day", "-2 months") |
| `decode_uri`    | Decodes a URI-encoded string via `decodeURIComponent`                 |
| `duration`      | Formats an ISO 8601 duration string as human-readable text            |
| `first`         | Returns the first element of a JSON array string                      |
| `footnote`      | Converts a URL into a Markdown footnote reference                     |
| `fragment_link` | Appends a URL fragment anchor to a link                               |
| `join`          | Joins a JSON array with a separator (default `, `)                    |
| `kebab`         | Converts to kebab-case                                                |
| `last`          | Returns the last element of a JSON array string                       |
| `length`        | Returns the character count of the string                             |
| `link`          | Wraps text and URL in a Markdown link `[text](url)`                   |
| `list`          | Converts a JSON array to a Markdown unordered list                    |
| `lower`         | Converts to lowercase                                                 |
| `map`           | Maps each element of a JSON array through a template expression       |
| `merge`         | Deep-merges two JSON objects                                          |
| `nth`           | Returns the element at a given index of a JSON array                  |
| `number_format` | Formats a number with locale-aware thousands separators               |
| `object`        | Converts a flat key/value string to a JSON object                     |
| `pascal`        | Converts to PascalCase                                                |
| `replace`       | Replaces occurrences of a pattern with a replacement string           |
| `reverse`       | Reverses a string or JSON array                                       |
| `round`         | Rounds a number to a given number of decimal places                   |
| `safe_name`     | Strips characters illegal in local filenames                          |
| `slice`         | Returns a substring or array slice                                    |
| `snake`         | Converts to snake_case                                                |
| `split`         | Splits a string into a JSON array on a delimiter                      |
| `strip_md`      | Strips Markdown formatting, returning plain text                      |
| `table`         | Converts a JSON array of objects to a Markdown table                  |
| `title`         | Converts to Title Case                                                |
| `trim`          | Strips leading and trailing whitespace                                |
| `uncamel`       | Converts camelCase to space-separated words                           |
| `unescape`      | Unescapes HTML entities                                               |
| `unique`        | Removes duplicate elements from a JSON array                          |
| `upper`         | Converts to uppercase                                                 |
| `wikilink`      | Wraps text in a `[[wikilink]]`                                        |

---

## Usage Example

```typescript
import { createPopulatedFilterRegistry } from '@domain/filters';
import { render } from '@domain/template/renderer';

const filterRegistry = createPopulatedFilterRegistry();

// Direct usage
const result = filterRegistry.apply('safe_name', 'My Article: A Review!', []);
// → 'My Article- A Review!'

// Passed to the renderer
const rendered = await render('{{ title | trim | lower }}', {
  variables: { title: '  My Page  ' },
  currentUrl: 'https://example.com',
  filterRegistry,
});
// → 'my page'
```

For high-level template compilation (frontmatter + body), prefer `compileTemplate()` from
`@domain/template/compiler` — it wires up `createPopulatedFilterRegistry()` automatically.

## Notes

- `createPopulatedFilterRegistry()` is used internally by `compileTemplate()`. Pass it to
  `render()` directly only when you need to bypass the compiler's frontmatter splitting.
- To add custom filters alongside the built-ins, call `createPopulatedFilterRegistry()`,
  obtain the registry, then register additional `FilterFn` entries on it.
- Unknown filter names are passed through silently — `apply('unknown', value, [])` returns
  `value` unchanged. This makes templates forward-compatible with future filter additions.
