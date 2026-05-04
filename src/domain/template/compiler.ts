// Template compiler entry point for the Web Harvester template engine.
//
// Provides the high-level `compileTemplate` API used by the application layer.
// The compiler:
// 1. Wires up a default `RenderContext` (filter registry, current URL).
// 2. Delegates rendering to `@domain/template/renderer`.
// 3. Splits the rendered output into YAML frontmatter and body when an
//    opening `---` fence appears at the very start of the result.

import { createPopulatedFilterRegistry } from '@domain/filters/index';
import { render, type RenderContext } from '@domain/template/renderer';

// ============================================================================
// Public Types
// ============================================================================

/**
 * Variables available to a template at compile time. The four required fields
 * (`title`, `url`, `content`, `date`) are always populated by the extractor;
 * other fields are present when the page exposes them. Additional ad-hoc
 * fields may be supplied via the index signature.
 */
export interface TemplateVariables {
  /** Page title. */
  title: string;
  /** Page URL. */
  url: string;
  /** Extracted page content. */
  content: string;
  /** ISO-formatted date string for the capture. */
  date: string;
  /** Optional page description/summary. */
  description?: string;
  /** Optional page author. */
  author?: string;
  /** Optional hero/og image URL. */
  image?: string;
  /** Optional site/publication name. */
  site?: string;
  /** Optional comma-separated tag list. */
  tags?: string;
  /** Additional template-specific fields. */
  [key: string]: string | undefined;
}

/**
 * A non-fatal compile error annotated with source position when available.
 */
export interface CompileError {
  /** Human-readable error message. */
  message: string;
  /** 1-based line number in the template source, when known. */
  line?: number;
  /** 1-based column number in the template source, when known. */
  column?: number;
}

/**
 * Result of compiling a template.
 */
export interface CompileResult {
  /** YAML frontmatter content (between `---` markers), or empty string. */
  frontmatter: string;
  /** Body content (after the frontmatter block, or the full output if none). */
  body: string;
  /** Any render errors encountered. */
  errors: CompileError[];
}

// ============================================================================
// Compiler
// ============================================================================

/**
 * Compile a template string against the given variables.
 *
 * Frontmatter is detected as content between two `---` lines at the very
 * start of the rendered output. If no frontmatter block is present,
 * `frontmatter` is an empty string and the full rendered output is returned
 * as `body`.
 *
 * Errors are returned in the result rather than thrown — callers can decide
 * how to surface them.
 */
export async function compileTemplate(
  template: string,
  variables: TemplateVariables,
): Promise<CompileResult> {
  const context: RenderContext = {
    variables: variables as Record<string, unknown>,
    currentUrl: variables.url,
    filterRegistry: createPopulatedFilterRegistry(),
  };

  const renderResult = await render(template, context, { trimOutput: false });

  if (renderResult.errors.length > 0) {
    return { frontmatter: '', body: '', errors: renderResult.errors };
  }

  const { frontmatter, body } = splitFrontmatter(renderResult.output);
  return { frontmatter, body, errors: [] };
}

// ============================================================================
// Frontmatter Splitting
// ============================================================================

const FM_FENCE = '---';

/**
 * Split rendered output into frontmatter and body.
 * Frontmatter must start at position 0 and be wrapped by `---` lines.
 */
function splitFrontmatter(output: string): { frontmatter: string; body: string } {
  const lines = output.split('\n');

  if (lines[0]?.trim() !== FM_FENCE) {
    return { frontmatter: '', body: output };
  }

  const closingIndex = lines.findIndex((line, i) => i > 0 && line.trim() === FM_FENCE);
  if (closingIndex === -1) {
    return { frontmatter: '', body: output };
  }

  const frontmatter = lines.slice(1, closingIndex).join('\n');
  const body = lines
    .slice(closingIndex + 1)
    .join('\n')
    .replace(/^\n/, '');
  return { frontmatter, body };
}
