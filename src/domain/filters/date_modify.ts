// Date-modify filter — add or subtract a duration from a date string.

// jscpd:ignore-start
import dayjs, { type ManipulateType } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

import { stripOuterParens, stripOuterQuotes } from '@domain/filters/_shared';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);
// jscpd:ignore-end

const VALID_UNITS = new Set(['year', 'month', 'week', 'day', 'hour', 'minute', 'second']);

/** Parsed modify operation: add (`+`) or subtract (`-`) `amount` `unit`s. */
interface ModifyOp {
  /** Operation direction: `+` to add, `-` to subtract. */
  operation: '+' | '-';
  /** Numeric amount of units to apply. */
  amount: number;
  /** Time unit (year, month, week, day, hour, minute, second). */
  unit: ManipulateType;
}

function parseModifyParam(param: string): ModifyOp | undefined {
  const cleaned = stripOuterQuotes(stripOuterParens(param)).trim();
  // eslint-disable-next-line sonarjs/slow-regex
  const match = /^([+-])\s*(\d+)\s*(\w+?)s?$/.exec(cleaned);
  if (!match) return undefined;
  /* v8 ignore next 7 -- regex captures are guaranteed when match is non-null */
  const unit = (match[3] ?? '').toLowerCase();
  if (!VALID_UNITS.has(unit)) return undefined;
  return {
    operation: (match[1] ?? '+') as '+' | '-',
    amount: parseInt(match[2] ?? '0', 10),
    unit: unit as ManipulateType,
  };
}

/**
 * Add or subtract a duration from a date string. Format: `+1 day`,
 * `-2 weeks`, `+3 months`, etc. Supported units are year, month, week, day,
 * hour, minute, second (with or without trailing `s`). Returns the input
 * unchanged on any error.
 */
export function date_modify(value: string, param?: string): string {
  if (!param) return value;
  if (value === '') return value;

  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;

  const op = parseModifyParam(param);
  if (!op) return value;

  const result =
    op.operation === '+' ? parsed.add(op.amount, op.unit) : parsed.subtract(op.amount, op.unit);
  return result.format('YYYY-MM-DD');
}
