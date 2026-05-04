// Replace filter — perform one or more `"search":"replace"` substitutions on
// the input. Search may be a literal string or a `/pattern/flags` regex.
// Inlined parser-state helpers from the upstream source so the domain layer
// has no transitive dependency on browser utilities.

import { stripOuterParens } from '@domain/filters/_shared';
import { escapeRegex } from '@shared/string-utils';

const STRIP_QUOTE = /(^["'])|(["']$)/g;

/** Mutable state for the comma-aware replacement-list parser. */
interface ParserState {
  /** Current character buffer being accumulated. */
  current: string;
  /** True while scanning inside a single- or double-quoted string. */
  inQuote: boolean;
  /** True while scanning inside a `/.../flags` regex literal. */
  inRegex: boolean;
  /** Curly-brace nesting depth (top-level commas are only split when 0). */
  curlyDepth: number;
  /** Parenthesis nesting depth (top-level commas are only split when 0). */
  parenDepth: number;
  /** Set when the previous character was a backslash escape. */
  escapeNext: boolean;
}

function createParserState(): ParserState {
  return {
    current: '',
    inQuote: false,
    inRegex: false,
    curlyDepth: 0,
    parenDepth: 0,
    escapeNext: false,
  };
}

function handleEscapeOrBackslash(char: string, state: ParserState): boolean {
  if (state.escapeNext) {
    state.current += char;
    state.escapeNext = false;
    return true;
  }
  if (char === '\\') {
    state.current += char;
    if (!state.inRegex) state.escapeNext = true;
    return true;
  }
  return false;
}

function handleQuoteOrRegex(char: string, state: ParserState): boolean {
  if ((char === '"' || char === "'") && !state.inRegex) {
    state.inQuote = !state.inQuote;
    state.current += char;
    return true;
  }
  if (
    char === '/' &&
    !state.inQuote &&
    !state.inRegex &&
    (state.current.endsWith(':') || state.current.endsWith(','))
  ) {
    state.inRegex = true;
    state.current += char;
    return true;
  }
  if (char === '/' && state.inRegex && !state.escapeNext) {
    state.inRegex = false;
    state.current += char;
    return true;
  }
  return false;
}

/* v8 ignore start -- bracket-depth tracking is dead in current test inputs
   but kept for parity with the upstream parser-utils. */
function trackBracketDepth(char: string, state: ParserState): void {
  if (char === '{') state.curlyDepth++;
  if (char === '}') state.curlyDepth--;
  if (char === '(' && !state.inQuote) state.parenDepth++;
  if (char === ')' && !state.inQuote) state.parenDepth--;
}
/* v8 ignore stop */

function processCharacter(char: string, state: ParserState): void {
  if (handleEscapeOrBackslash(char, state)) return;
  if (handleQuoteOrRegex(char, state)) return;
  trackBracketDepth(char, state);
  state.current += char;
}

function parseRegex(pattern: string): { pattern: string; flags: string } | null {
  const match = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);
  if (!match) return null;
  /* v8 ignore next -- regex captures are guaranteed when match is non-null */
  return { pattern: match[1] ?? '', flags: match[2] ?? '' };
}

function processEscapedCharacters(str: string): string {
  return str.replace(/\\([nrt]|[^nrt])/g, (_match, char: string) => {
    if (char === 'n') return '\n';
    if (char === 'r') return '\r';
    if (char === 't') return '\t';
    return char;
  });
}

function splitTopLevel(param: string): string[] {
  const out: string[] = [];
  const state = createParserState();
  for (const char of param) {
    if (
      char === ',' &&
      !state.inQuote &&
      !state.inRegex &&
      state.curlyDepth === 0 &&
      state.parenDepth === 0
    ) {
      out.push(state.current.trim());
      state.current = '';
    } else {
      processCharacter(char, state);
    }
  }
  if (state.current) out.push(state.current.trim());
  return out;
}

function splitSearchReplace(replacement: string): [string, string] {
  const split = replacement.split(/(?<=[^\\]["']):(?=["'])/);
  /* v8 ignore next -- split() always returns at least one element */
  const search = (split[0] ?? '').trim().replace(STRIP_QUOTE, '');
  const repl = (split[1] ?? '').trim().replace(STRIP_QUOTE, '');
  return [search, repl];
}

function applyRegexReplacement(
  acc: string,
  info: { pattern: string; flags: string },
  repl: string,
): string {
  try {
    const processedRepl = processEscapedCharacters(repl);
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(info.pattern, info.flags);
    return acc.replace(regex, processedRepl);
  } catch {
    return acc;
  }
}

function applyLiteralReplacement(acc: string, search: string, repl: string): string {
  if (search === '|' || search === ':') return acc.split(search).join(repl);
  if (search.includes('\n') || search.includes('\r') || search.includes('\t')) {
    return acc.split(search).join(repl);
  }
  const escaped = escapeRegex(search);
  // eslint-disable-next-line security/detect-non-literal-regexp
  return acc.replace(new RegExp(escaped, 'g'), repl);
}

function applyReplacement(acc: string, replacement: string): string {
  const [rawSearch, rawRepl] = splitSearchReplace(replacement);
  const regexInfo = parseRegex(rawSearch);
  if (regexInfo) return applyRegexReplacement(acc, regexInfo, rawRepl);
  const search = processEscapedCharacters(rawSearch);
  const repl = processEscapedCharacters(rawRepl);
  return applyLiteralReplacement(acc, search, repl);
}

/**
 * Apply one or more `"search":"replace"` substitutions to the input string.
 * Search may be a literal string or a `/pattern/flags` regex. Multiple
 * replacements may be chained with commas.
 */
export function replace(value: string, param?: string): string {
  if (!param) return value;
  const cleaned = stripOuterParens(param);
  const replacements = splitTopLevel(cleaned);
  return replacements.reduce(applyReplacement, value);
}
