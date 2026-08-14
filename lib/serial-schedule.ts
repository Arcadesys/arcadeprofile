import { SITE_TZ, datePartsInTimeZone, isoDateFromParts } from './site-time';

export const CHAPTER_SERIAL_CADENCE = 'weekly' as const;
export const CHAPTER_SERIAL_WEEKDAY = 'monday' as const;
export const CHAPTER_SERIAL_TIME = '09:00' as const;

export interface ChapterSerialSchedule {
  enabled?: boolean | null;
  cadence?: 'weekly' | null;
  weekday?: 'monday' | null;
  time?: string | null;
}

export function isChapterSerialSchedule(value?: ChapterSerialSchedule | null): boolean {
  return value?.enabled === true && value.cadence === CHAPTER_SERIAL_CADENCE && value.weekday === CHAPTER_SERIAL_WEEKDAY;
}

export function parseLocalTime(value: string | null | undefined): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value?.trim() || '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function timeZoneOffsetMs(candidate: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(candidate)) values[part.type] = part.value;
  const renderedUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return renderedUtc - candidate.getTime();
}

/** Convert an unambiguous daytime wall-clock value in `timeZone` to a UTC instant. */
export function zonedDateTimeToUtc(
  date: string,
  time: string = CHAPTER_SERIAL_TIME,
  timeZone: string = SITE_TZ,
): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const localTime = parseLocalTime(time);
  if (!dateMatch || !localTime) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const wallClockUtc = Date.UTC(year, month - 1, day, localTime.hour, localTime.minute, 0, 0);
  const seed = new Date(wallClockUtc);
  const resolved = new Date(wallClockUtc - timeZoneOffsetMs(seed, timeZone));
  // One more pass handles a UTC date boundary around the zone offset.
  const stabilized = new Date(wallClockUtc - timeZoneOffsetMs(resolved, timeZone));
  const parts = datePartsInTimeZone(stabilized, timeZone);
  const local = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(stabilized);
  const rendered: Record<string, string> = {};
  for (const part of local) rendered[part.type] = part.value;
  if (
    isoDateFromParts(parts) !== date ||
    Number(rendered.hour) !== localTime.hour ||
    Number(rendered.minute) !== localTime.minute
  ) {
    return null;
  }
  return stabilized.toISOString();
}
