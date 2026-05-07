# Presentation Utilities Catalog

Functions and types in `src/presentation/` that are reusable across presentation components. Organized by sub-module.

---

## `src/presentation/popup/lib/parseFrontmatter.ts`

Utilities for parsing and rebuilding YAML frontmatter in markdown strings.

| Name                                          | Kind      | Description                                                                                                                                                                                                             |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FrontmatterField`                            | Interface | A single key-value pair parsed from YAML frontmatter. Has `readonly key: string` and `readonly value: string`.                                                                                                          |
| `parseFrontmatterFields(markdown)`            | Function  | Parses simple `key: value` YAML frontmatter from a markdown string. Returns `FrontmatterField[]`. Returns empty array when no frontmatter block is present, closing fence is missing, or block has no parseable fields. |
| `rebuildMarkdownWithFields(markdown, fields)` | Function  | Rebuilds a markdown string by replacing its frontmatter block with the supplied fields as `key: value` lines. Returns the original markdown unchanged when it contains no frontmatter block.                            |
