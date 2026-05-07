/** A single key-value pair parsed from YAML frontmatter. */
export interface FrontmatterField {
  readonly key: string;
  readonly value: string;
}

/**
 * Parses simple `key: value` YAML frontmatter from a markdown string.
 * Only handles scalar string values on a single line. Returns an empty array
 * when no frontmatter block is present, the closing fence is missing, or the
 * block contains no parseable fields.
 */
export function parseFrontmatterFields(markdown: string): FrontmatterField[] {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== '---') return [];

  const closeIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (closeIndex === -1) return [];

  const fields: FrontmatterField[] = [];
  for (const line of lines.slice(1, closeIndex)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key.length > 0) {
      fields.push({ key, value });
    }
  }
  return fields;
}

/**
 * Rebuilds a markdown string by replacing its frontmatter block with the
 * supplied fields rendered as `key: value` lines. Returns the original
 * markdown unchanged when it contains no frontmatter block.
 */
export function rebuildMarkdownWithFields(markdown: string, fields: FrontmatterField[]): string {
  const lines = markdown.split('\n');
  if (lines[0]?.trim() !== '---') return markdown;

  const closeIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (closeIndex === -1) return markdown;

  const bodyLines = lines.slice(closeIndex + 1);
  const newYaml = fields.map(({ key, value }) => `${key}: ${value}`);
  return ['---', ...newYaml, '---', ...bodyLines].join('\n');
}
