// Calc filter — perform a single arithmetic operation on a numeric input.
// Supported operators: + - * / ^ ** (^ and ** both raise to a power).

import { stripLooseQuotes } from '@domain/filters/_shared';

function applyOperation(num: number, operator: string, value: number): number | undefined {
  switch (operator) {
    case '+':
      return num + value;
    case '-':
      return num - value;
    case '*':
      return num * value;
    case '/':
      return num / value;
    case '**':
    case '^':
      return Math.pow(num, value);
    default:
      return undefined;
  }
}

/**
 * Apply an arithmetic operation to the numeric input. The operation is
 * provided as a string starting with `+`, `-`, `*`, `/`, `^`, or `**`
 * followed by a number, e.g. `+10`, `*2`, `**3`. Returns the input
 * unchanged on any error.
 */
export function calc(value: string, param?: string): string {
  if (!param) return value;

  const num = Number(value);
  if (isNaN(num)) return value;

  const operation = stripLooseQuotes(param).trim();
  const operator = operation.slice(0, 2) === '**' ? '**' : operation.charAt(0);
  const rhs = Number(operation.slice(operator === '**' ? 2 : 1));

  if (isNaN(rhs)) return value;

  const result = applyOperation(num, operator, rhs);
  if (result === undefined) return value;

  return Number(result.toFixed(10)).toString();
}
