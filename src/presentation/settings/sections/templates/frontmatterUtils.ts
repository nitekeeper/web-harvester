import type { FrontmatterRow } from './templateTypes';

/**
 * Parses a YAML-style template frontmatter string (one `key: value` per line)
 * into an ordered array of `FrontmatterRow` objects. Blank lines are ignored.
 * The first `:` on each line separates key from value.
 */
export function parseFrontmatter(template: string): FrontmatterRow[] {
  if (!template.trim()) return [];
  return template
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return { key: line.trim(), value: '' };
      return {
        key: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      };
    });
}

/**
 * Serializes an ordered array of `FrontmatterRow` objects back into a YAML
 * template string compatible with `parseFrontmatter`. Each row becomes one
 * `key: value` line; rows are joined by `\n` with no trailing newline.
 */
export function serializeFrontmatter(rows: readonly FrontmatterRow[]): string {
  return rows.map((r) => `${r.key}: ${r.value}`).join('\n');
}
