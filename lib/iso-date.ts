export interface IsoDateOnlyParts {
  year: number;
  month: number;
  day: number;
}

const ISO_DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateOnly(value: string): IsoDateOnlyParts | null {
  const match = ISO_DATE_ONLY_RE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isIsoDateOnly(value: unknown): value is string {
  return typeof value === 'string' && parseIsoDateOnly(value) !== null;
}

export function isoDateOnlyToUtcDate(value: string): Date | null {
  const parts = parseIsoDateOnly(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function isoDateOnlyToScheduledIso(
  value: string,
  hourUtc: number,
  minuteUtc = 0,
  secondUtc = 0,
  millisecondUtc = 0,
): string | null {
  const parts = parseIsoDateOnly(value);
  if (!parts) return null;
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hourUtc, minuteUtc, secondUtc, millisecondUtc),
  ).toISOString();
}
