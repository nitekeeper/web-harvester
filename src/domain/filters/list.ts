// List filter — render JSON arrays as Markdown bullet, numbered, task, or
// numbered-task lists. Nested arrays produce indented sub-lists.

import { PARSE_FAILED, parseJson } from '@domain/filters/_shared';

const NUMBERED = 'numbered';
const TASK = 'task';
const NUMBERED_TASK = 'numbered-task';
const BULLET = 'bullet';

/** Markdown list style — bullet (default), numbered, task, or numbered-task. */
type ListType = typeof BULLET | typeof NUMBERED | typeof TASK | typeof NUMBERED_TASK;

function determineListType(param?: string): ListType {
  if (param === NUMBERED) return NUMBERED;
  if (param === TASK) return TASK;
  if (param === NUMBERED_TASK) return NUMBERED_TASK;
  return BULLET;
}

function prefixFor(type: ListType): string {
  if (type === NUMBERED) return '1. ';
  if (type === TASK) return '- [ ] ';
  if (type === NUMBERED_TASK) return '1. [ ] ';
  return '- ';
}

function processArray(arr: unknown[], type: ListType, depth: number): string {
  return arr
    .map((item, index) => {
      if (Array.isArray(item)) return processArray(item, type, depth + 1);
      const indent = '\t'.repeat(depth);
      const prefix = prefixFor(type);
      const line = `${indent}${prefix}${String(item)}`;
      if (type === NUMBERED || type === NUMBERED_TASK) {
        return line.replace(/^(\t*)\d+/, `$1${index + 1}`);
      }
      return line;
    })
    .join('\n');
}

/**
 * Render a JSON array as a Markdown list. The optional `param` selects the
 * list style: `numbered`, `task`, or `numbered-task` (default is `bullet`).
 * Nested arrays produce indented sub-lists.
 */
export function list(value: string, param?: string): string {
  if (value === '') return value;
  const type = determineListType(param);
  const parsed = parseJson(value);
  if (parsed !== PARSE_FAILED) {
    if (Array.isArray(parsed)) return processArray(parsed, type, 0);
    return processArray([parsed], type, 0);
  }
  return processArray([value], type, 0);
}
