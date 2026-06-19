export const DEFAULT_SITE_TZ = 'America/Chicago';

function validTimeZone(value: string | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function resolveSiteTimeZone(value: string | undefined): string {
  return validTimeZone(value) ? value : DEFAULT_SITE_TZ;
}

export const SITE_TZ = resolveSiteTimeZone(process.env.SITE_TZ);

export interface SiteDateParts {
  year: number;
  month: number;
  day: number;
  weekdayMonZero: number;
}

export function datePartsInTimeZone(date: Date, timeZone: string = SITE_TZ): SiteDateParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) map[part.type] = part.value;
  const weekdayShortToMonZero: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekdayMonZero: weekdayShortToMonZero[map.weekday!] ?? 0,
  };
}

export function isoDateFromParts(parts: Pick<SiteDateParts, 'year' | 'month' | 'day'>): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function todayInSiteTz(now: Date = new Date(), timeZone: string = SITE_TZ): string {
  return isoDateFromParts(datePartsInTimeZone(now, timeZone));
}

function parseDate(input: string | Date): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSiteDate(input: string | Date): string {
  const date = parseDate(input);
  if (!date) return input instanceof Date ? input.toString() : input;

  return date.toLocaleDateString('en-US', {
    timeZone: SITE_TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatSiteDateTime(input: string | Date): string {
  const date = parseDate(input);
  if (!date) return input instanceof Date ? input.toString() : input;

  return date.toLocaleString('en-US', {
    timeZone: SITE_TZ,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
