// Whitespace utilities for the template renderer.
// Split out of `./renderer` to keep each module under the 400-line ceiling.
//
// Provides leading/trailing whitespace trimming used by Twig-style
// `trimLeft` / `trimRight` markers, plus the helper that appends node
// output to an accumulator while honoring those markers.

import type { ASTNode } from '@domain/template/parser';
import type { RenderState } from '@domain/template/renderer-eval';

/**
 * Trim trailing whitespace and an optional newline from a string.
 * Used for `trimLeft` handling (removes whitespace at the end of previous output).
 */
/* v8 ignore start */
export function trimTrailingWhitespace(str: string): string {
  // Mirrors /[\t ]*\r?\n?$/ — strips trailing tabs/spaces and an optional
  // trailing CRLF/LF that follows them. Hand-rolled to sidestep
  // sonarjs/slow-regex warnings on anchored quantifier patterns.
  let end = str.length;
  // Optional trailing newline (\r\n or \n) AFTER any trailing whitespace.
  if (end > 0 && str.charCodeAt(end - 1) === 0x0a /* \n */) {
    end -= 1;
    if (end > 0 && str.charCodeAt(end - 1) === 0x0d /* \r */) {
      end -= 1;
    }
  }
  // Trailing tabs/spaces (the [\t ]* part of the original pattern).
  while (end > 0) {
    const ch = str.charCodeAt(end - 1);
    if (ch === 0x20 /* space */ || ch === 0x09 /* tab */) {
      end -= 1;
    } else {
      break;
    }
  }
  return end === str.length ? str : str.slice(0, end);
}
/* v8 ignore stop */

/**
 * Trim leading whitespace and an optional newline from a string.
 * Used for `trimRight` handling (removes whitespace at the start of next output).
 */
export function trimLeadingWhitespace(str: string): string {
  // Mirrors /^[\t ]*\r?\n?/ — strips leading tabs/spaces and an optional
  // following CRLF/LF. Hand-rolled to keep the linter happy.
  let start = 0;
  const len = str.length;
  while (start < len) {
    const ch = str.charCodeAt(start);
    if (ch === 0x20 /* space */ || ch === 0x09 /* tab */) {
      start += 1;
    } else {
      break;
    }
  }
  if (start < len && str.charCodeAt(start) === 0x0d /* \r */) {
    start += 1;
  }
  if (start < len && str.charCodeAt(start) === 0x0a /* \n */) {
    start += 1;
  }
  return start === 0 ? str : str.slice(start);
}

/**
 * Append node output to accumulated output, handling whitespace trimming.
 * Handles both `trimLeft` (trim trailing from previous) and `trimRight`
 * (trim leading from current).
 */
export function appendNodeOutput(
  output: string,
  nodeOutput: string,
  node: ASTNode,
  state: RenderState,
): string {
  let acc = output;

  // Handle trimLeft - trim trailing whitespace from previous output. The
  // tokenizer in this codebase never emits `trimLeft: true`, so this branch
  // is currently unreachable; the code is kept to mirror the upstream
  // template engine and to keep the door open for a `{%-` syntax extension.
  /* v8 ignore next 3 */
  if ('trimLeft' in node && node.trimLeft && acc.length > 0) {
    acc = trimTrailingWhitespace(acc);
  }

  if (state.pendingTrimRight && nodeOutput.length > 0) {
    acc += trimLeadingWhitespace(nodeOutput);
    state.pendingTrimRight = false;
  } else {
    acc += nodeOutput;
  }

  return acc;
}
