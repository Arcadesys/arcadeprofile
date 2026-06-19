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
