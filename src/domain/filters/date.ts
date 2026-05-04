// Date filter — format dates using dayjs, with support for both
// `format` and `(format, inputFormat)` styles.

// jscpd:ignore-start
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

import { splitQuoteAware, stripOuterParens, stripOuterQuotes } from '@domain/filters/_shared';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);
// jscpd:ignore-end

function parseDateParams(param: string): [string, string | undefined] {
  const cleaned = stripOuterParens(param);
  const parts = splitQuoteAware(cleaned).map((p) => stripOuterQuotes(p.trim()));
  /* v8 ignore next -- split() always returns at least one element */
  return [parts[0] ?? '', parts[1]];
}

/**
 * Format a date using a dayjs-compatible format string. Supports both
 * `date:"YYYY"` and `date:("YYYY-MM-DD","MM/DD/YYYY")` styles. The literal
 * input `"now"` is interpreted as the current date/time. Invalid dates and
 * empty input pass through unchanged.
 */
export function date(value: string, param?: string): string {
  if (value === '') return value;

  const inputDate: string | Date = value === 'now' ? new Date() : value;

  if (!param) return dayjs(inputDate).format('YYYY-MM-DD');

  const [outputFormat, inputFormat] = parseDateParams(param);
  const parsed = inputFormat ? dayjs(inputDate, inputFormat, true) : dayjs(inputDate);
  if (!parsed.isValid()) return value;

  return parsed.format(outputFormat);
}
