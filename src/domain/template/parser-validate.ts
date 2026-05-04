// Template parser — variable reference validation.
// After parsing, walk the AST to find references to unknown variables and
// suggest the closest preset name via Levenshtein distance.

import type { ASTNode, Expression, ParserError } from './parser-types';

/**
 * Known preset variables that are always available in a template.
 */
const PRESET_VARIABLES: ReadonlySet<string> = new Set([
  'author',
  'content',
  'contentHtml',
  'date',
  'description',
  'domain',
  'favicon',
  'fullHtml',
  'highlights',
  'image',
  'language',
  'published',
  'transcript',
  'selection',
  'selectionHtml',
  'site',
  'title',
  'time',
  'url',
  'words',
]);

/**
 * Special variable prefixes that indicate dynamic, runtime-resolved
 * variables — anything starting with one of these is considered valid.
 */
const SPECIAL_PREFIXES = ['schema:', 'selector:', 'selectorHtml:', 'meta:'];

function getCell(matrix: Uint16Array, width: number, row: number, col: number): number {
  // Caller guarantees `row * width + col` is in-bounds — see fillLevenshteinRow
  // which only accesses cells inside the allocated [height x width] grid.
  return matrix.at(row * width + col) as number;
}

function setCell(
  matrix: Uint16Array,
  width: number,
  row: number,
  col: number,
  value: number,
): void {
  matrix.set([value], row * width + col);
}

function fillLevenshteinRow(
  matrix: Uint16Array,
  width: number,
  a: string,
  b: string,
  i: number,
): void {
  for (let j = 1; j <= a.length; j++) {
    if (b.charAt(i - 1) === a.charAt(j - 1)) {
      setCell(matrix, width, i, j, getCell(matrix, width, i - 1, j - 1));
    } else {
      const replace = getCell(matrix, width, i - 1, j - 1) + 1;
      const insert = getCell(matrix, width, i, j - 1) + 1;
      const remove = getCell(matrix, width, i - 1, j) + 1;
      setCell(matrix, width, i, j, Math.min(replace, insert, remove));
    }
  }
}

/**
 * Calculate Levenshtein distance between two strings — used for fuzzy
 * matching of unknown variable names against preset names.
 */
export function levenshteinDistance(a: string, b: string): number {
  const width = a.length + 1;
  const height = b.length + 1;
  const matrix = new Uint16Array(width * height);

  for (let i = 0; i < height; i++) setCell(matrix, width, i, 0, i);
  for (let j = 0; j < width; j++) setCell(matrix, width, 0, j, j);

  for (let i = 1; i < height; i++) {
    fillLevenshteinRow(matrix, width, a, b, i);
  }

  return getCell(matrix, width, b.length, a.length);
}

function findSimilarVariable(name: string): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const preset of PRESET_VARIABLES) {
    const distance = levenshteinDistance(name.toLowerCase(), preset.toLowerCase());
    if (distance < Math.max(name.length, preset.length) / 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = preset;
    }
  }

  return bestMatch;
}

function hasSpecialPrefix(name: string): boolean {
  return SPECIAL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isValidVariable(name: string, definedVariables: ReadonlySet<string>): boolean {
  if (hasSpecialPrefix(name)) return true;
  if (PRESET_VARIABLES.has(name)) return true;
  if (definedVariables.has(name)) return true;

  // String.prototype.split always returns at least one element, so .at(0) is
  // safe — the cast asserts that to the type system.
  const afterDot = name.split('.').at(0) as string;
  const baseName = afterDot.split('[').at(0) as string;
  return PRESET_VARIABLES.has(baseName) || definedVariables.has(baseName) || baseName === 'loop';
}

/**
 * Locator for the base identifier that backs an expression — used so the
 * validator can attribute errors to the variable name and not the wrapping
 * filter or member access.
 */
interface VarLocation {
  name: string;
  line: number;
  column: number;
}

function getVariableNameFromExpression(expr: Expression): VarLocation | null {
  switch (expr.type) {
    case 'identifier':
      return { name: expr.name, line: expr.line, column: expr.column };
    case 'filter':
      return getVariableNameFromExpression(expr.value);
    case 'member':
      return getVariableNameFromExpression(expr.object);
    case 'binary':
      if (expr.operator === '??') {
        return getVariableNameFromExpression(expr.left);
      }
      return null;
    default:
      return null;
  }
}

/**
 * A variable reference paired with the set of variables that were in scope
 * at the point of reference. Used to validate references against scope.
 */
interface ScopedReference extends VarLocation {
  scope: Set<string>;
}

function collectFromVariableNode(
  node: ASTNode & { type: 'variable' },
  references: ScopedReference[],
  defined: Set<string>,
): void {
  const varInfo = getVariableNameFromExpression(node.expression);
  if (varInfo) {
    references.push({ ...varInfo, scope: new Set(defined) });
  }
  collectExpression(node.expression, defined, references);
}

function collectFromIfNode(
  node: ASTNode & { type: 'if' },
  references: ScopedReference[],
  defined: Set<string>,
): void {
  collectExpression(node.condition, defined, references);
  collectVariables(node.consequent, defined, references);
  for (const elseif of node.elseifs) {
    collectExpression(elseif.condition, defined, references);
    collectVariables(elseif.body, defined, references);
  }
  if (node.alternate) collectVariables(node.alternate, defined, references);
}

function collectFromForNode(
  node: ASTNode & { type: 'for' },
  references: ScopedReference[],
  defined: Set<string>,
): void {
  collectExpression(node.iterable, defined, references);
  const loopVariables = new Set(defined);
  loopVariables.add(node.iterator);
  loopVariables.add(`${node.iterator}_index`);
  collectVariables(node.body, loopVariables, references);
}

function collectVariables(
  nodes: ASTNode[],
  definedVariables: Set<string>,
  references: ScopedReference[],
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'variable':
        collectFromVariableNode(node, references, definedVariables);
        break;
      case 'set':
        definedVariables.add(node.variable);
        collectExpression(node.value, definedVariables, references);
        break;
      case 'if':
        collectFromIfNode(node, references, definedVariables);
        break;
      case 'for':
        collectFromForNode(node, references, definedVariables);
        break;
    }
  }
}

function collectExpression(
  expr: Expression,
  defined: Set<string>,
  references: ScopedReference[],
): void {
  switch (expr.type) {
    case 'identifier':
      references.push({
        name: expr.name,
        line: expr.line,
        column: expr.column,
        scope: new Set(defined),
      });
      break;
    case 'filter':
      collectExpression(expr.value, defined, references);
      for (const arg of expr.args) collectExpression(arg, defined, references);
      break;
    case 'binary':
      collectExpression(expr.left, defined, references);
      collectExpression(expr.right, defined, references);
      break;
    case 'unary':
      collectExpression(expr.argument, defined, references);
      break;
    case 'member':
      collectExpression(expr.object, defined, references);
      collectExpression(expr.property, defined, references);
      break;
    case 'group':
      collectExpression(expr.expression, defined, references);
      break;
  }
}

function buildUnknownVariableError(ref: ScopedReference): ParserError {
  const similar = findSimilarVariable(ref.name);
  let message = `Unknown variable "${ref.name}"`;
  if (similar) {
    message += `. Did you mean "${similar}"?`;
  }
  return { message, line: ref.line, column: ref.column };
}

/**
 * Validate every variable reference in the AST. Returns warnings for any
 * reference that does not resolve to a preset, special-prefix, defined, or
 * loop variable. Includes "Did you mean ..." suggestions for likely typos.
 */
export function validateVariables(ast: ASTNode[]): ParserError[] {
  const warnings: ParserError[] = [];
  const definedVariables = new Set<string>();
  const references: ScopedReference[] = [];

  collectVariables(ast, definedVariables, references);

  for (const ref of references) {
    if (!isValidVariable(ref.name, ref.scope)) {
      warnings.push(buildUnknownVariableError(ref));
    }
  }

  return warnings;
}
