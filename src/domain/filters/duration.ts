// Duration filter — format an ISO 8601 duration (`PT1H30M`) or a raw
// seconds value as `HH:mm:ss` / `mm:ss`.

import dayjs from 'dayjs';
import durationPlugin, { type Duration } from 'dayjs/plugin/duration';

import { padZero, stripLooseQuotes } from '@domain/filters/_shared';

dayjs.extend(durationPlugin);

// eslint-disable-next-line security/detect-unsafe-regex, sonarjs/regex-complexity
const ISO_RE = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

function pickFormat(dur: Duration, format?: string): string {
  if (format) return format.replace(/^["'(](.*)["')]$/g, '$1');
  return dur.asHours() >= 1 ? 'HH:mm:ss' : 'mm:ss';
}

function formatDuration(dur: Duration, format?: string): string {
  const fmt = pickFormat(dur, format);
  const hours = Math.floor(dur.asHours());
  const minutes = dur.minutes();
  const seconds = dur.seconds();
  const parts: Record<string, string> = {
    HH: padZero(hours),
    H: hours.toString(),
    mm: padZero(minutes),
    m: minutes.toString(),
    ss: padZero(seconds),
    s: seconds.toString(),
  };
  return fmt.replace(/HH|H|mm|m|ss|s/g, (match) => {
    /* v8 ignore next 2 -- the regex only matches keys that exist in `parts` */
    // eslint-disable-next-line security/detect-object-injection
    return Object.prototype.hasOwnProperty.call(parts, match) ? (parts[match] ?? '') : '';
  });
}

function isoToSeconds(matches: RegExpMatchArray): number {
  const [, years, months, days, hours, minutes, seconds] = matches;
  return (
    (years ? parseInt(years) * 365 * 24 * 3600 : 0) +
    (months ? parseInt(months) * 30 * 24 * 3600 : 0) +
    (days ? parseInt(days) * 24 * 3600 : 0) +
    (hours ? parseInt(hours) * 3600 : 0) +
    (minutes ? parseInt(minutes) * 60 : 0) +
    (seconds ? parseInt(seconds) : 0)
  );
}

/**
 * Format an ISO 8601 duration (e.g. `PT1H30M`) or a raw seconds value as
 * `HH:mm:ss` (when the duration is at least one hour) or `mm:ss` (when it
 * is shorter). A custom format string may be supplied.
 */
export function duration(value: string, param?: string): string {
  if (!value) return value;
  const stripped = stripLooseQuotes(value);
  const matches = ISO_RE.exec(stripped);
  if (matches) {
    const totalSeconds = isoToSeconds(matches);
    return formatDuration(dayjs.duration(totalSeconds, 'seconds'), param);
  }
  const seconds = parseInt(stripped, 10);
  if (isNaN(seconds)) return value;
  return formatDuration(dayjs.duration(seconds, 'seconds'), param);
}
