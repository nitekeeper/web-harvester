// Template parser — debug formatters for AST nodes and parser errors.
// Producers of human-readable strings used by tests, error messages, and
// development tooling.

import type { ASTNode, Expression, ParserError } from './parser-types';

function formatTextNode(value: string, pad: string): string {
  return `${pad}Text: ${JSON.stringify(value)}\n`;
}

function formatVariableNode(
  node: ASTNode & { type: 'variable' },
  pad: string,
  indent: number,
): string {
  return `${pad}Variable:\n` + formatExpression(node.expression, indent + 1);
}

function formatIfElseifs(node: ASTNode & { type: 'if' }, pad: string, indent: number): string {
  let out = '';
  for (const elseif of node.elseifs) {
    out += `${pad}  ElseIf:\n`;
    out += formatExpression(elseif.condition, indent + 2);
    out += formatAST(elseif.body, indent + 2);
  }
  return out;
}

function formatIfNode(node: ASTNode & { type: 'if' }, pad: string, indent: number): string {
  let out = `${pad}If:\n`;
  out += `${pad}  Condition:\n`;
  out += formatExpression(node.condition, indent + 2);
  out += `${pad}  Then:\n`;
  out += formatAST(node.consequent, indent + 2);
  out += formatIfElseifs(node, pad, indent);
  if (node.alternate) {
    out += `${pad}  Else:\n`;
    out += formatAST(node.alternate, indent + 2);
  }
  return out;
}

function formatForNode(node: ASTNode & { type: 'for' }, pad: string, indent: number): string {
  let out = `${pad}For: ${node.iterator} in\n`;
  out += formatExpression(node.iterable, indent + 1);
  out += `${pad}  Body:\n`;
  out += formatAST(node.body, indent + 2);
  return out;
}

function formatSetNode(node: ASTNode & { type: 'set' }, pad: string, indent: number): string {
  return `${pad}Set: ${node.variable} =\n` + formatExpression(node.value, indent + 1);
}

function formatNode(node: ASTNode, indent: number): string {
  const pad = '  '.repeat(indent);
  switch (node.type) {
    case 'text':
      return formatTextNode(node.value, pad);
    case 'variable':
      return formatVariableNode(node, pad, indent);
    case 'if':
      return formatIfNode(node, pad, indent);
    case 'for':
      return formatForNode(node, pad, indent);
    case 'set':
      return formatSetNode(node, pad, indent);
  }
}

/**
 * Format an AST node list into an indented multi-line string. Useful for
 * debugging and for diffing parser output in tests.
 */
export function formatAST(nodes: ASTNode[], indent = 0): string {
  let result = '';
  for (const node of nodes) {
    result += formatNode(node, indent);
  }
  return result;
}

function formatFilterExpression(
  expr: Expression & { type: 'filter' },
  pad: string,
  indent: number,
): string {
  let out = `${pad}Filter: ${expr.name}\n`;
  out += `${pad}  Value:\n`;
  out += formatExpression(expr.value, indent + 2);
  if (expr.args.length > 0) {
    out += `${pad}  Args:\n`;
    for (const arg of expr.args) {
      out += formatExpression(arg, indent + 2);
    }
  }
  return out;
}

/**
 * Format a single expression node into an indented multi-line string. Mirrors
 * `formatAST` for the expression sub-grammar.
 */
export function formatExpression(expr: Expression, indent: number): string {
  const pad = '  '.repeat(indent);

  switch (expr.type) {
    case 'literal':
      return `${pad}Literal: ${JSON.stringify(expr.value)}\n`;
    case 'identifier':
      return `${pad}Identifier: ${expr.name}\n`;
    case 'binary':
      return (
        `${pad}Binary: ${expr.operator}\n` +
        formatExpression(expr.left, indent + 1) +
        formatExpression(expr.right, indent + 1)
      );
    case 'unary':
      return `${pad}Unary: ${expr.operator}\n` + formatExpression(expr.argument, indent + 1);
    case 'filter':
      return formatFilterExpression(expr, pad, indent);
    case 'group':
      return `${pad}Group:\n` + formatExpression(expr.expression, indent + 1);
    case 'member':
      return (
        `${pad}Member:\n` +
        formatExpression(expr.object, indent + 1) +
        formatExpression(expr.property, indent + 1)
      );
  }
}

/**
 * Format a parser error with its source position prefix.
 */
export function formatParserError(error: ParserError): string {
  return `Error at line ${error.line}, column ${error.column}: ${error.message}`;
}
