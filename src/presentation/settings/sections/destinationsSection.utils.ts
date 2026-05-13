// src/presentation/settings/sections/destinationsSection.utils.ts

/** Month abbreviation names used to format last-used dates. */
export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Formatting function type for i18n message calls. */
export type FmtFn = (msg: {
  id: string;
  defaultMessage: string;
  values?: Record<string, string | number>;
}) => string;

function formatLastUsedDate(lastUsed: number, now: number, fmt: FmtFn): string {
  const date = new Date(lastUsed);
  const nowDate = new Date(now);
  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return fmt({ id: 'destinations.lastUsed.yesterday', defaultMessage: 'last used yesterday' });
  }
  const monthName = MONTHS[date.getMonth()] as string;
  if (date.getFullYear() === nowDate.getFullYear()) {
    return fmt({
      id: 'destinations.lastUsed.sameYear',
      defaultMessage: `last used ${monthName} ${date.getDate()}`,
      values: { month: monthName, day: date.getDate() },
    });
  }
  return fmt({
    id: 'destinations.lastUsed.olderYear',
    defaultMessage: `last used ${monthName} ${date.getDate()}, ${date.getFullYear()}`,
    values: { month: monthName, day: date.getDate(), year: date.getFullYear() },
  });
}

/** Formats a last-used timestamp as a human-readable relative string. */
export function formatLastUsed(lastUsed: number, now: number, fmt: FmtFn): string {
  const diffSec = Math.floor((now - lastUsed) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  if (diffSec < 60)
    return fmt({ id: 'destinations.lastUsed.justNow', defaultMessage: 'last used just now' });
  if (diffMin < 60)
    return fmt({
      id: 'destinations.lastUsed.minAgo',
      defaultMessage: `last used ${diffMin} min ago`,
      values: { n: diffMin },
    });
  if (diffHour < 24)
    return fmt({
      id: 'destinations.lastUsed.hourAgo',
      defaultMessage: `last used ${diffHour} hour${diffHour === 1 ? '' : 's'} ago`,
      values: { n: diffHour },
    });
  return formatLastUsedDate(lastUsed, now, fmt);
}
