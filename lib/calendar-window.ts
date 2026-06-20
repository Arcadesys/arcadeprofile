import { isIsoDateOnly, isoDateOnlyToUtcDate } from '@/lib/iso-date';

export interface CalendarWindow {
  start: string;
  end: string;
  endExclusiveIso: string;
}

export function parseCalendarWindow(
  start: string | null,
  end: string | null,
): { ok: true; window: CalendarWindow } | { ok: false; error: string } {
  if (!isIsoDateOnly(start) || !isIsoDateOnly(end)) {
    return { ok: false, error: 'valid start and end query params (YYYY-MM-DD) are required' };
  }

  if (start > end) {
    return { ok: false, error: 'start must be on or before end' };
  }

  // Inclusive end: convert to start-of-next-day for less-than comparison.
  const endExclusive = isoDateOnlyToUtcDate(end);
  if (!endExclusive) {
    return { ok: false, error: 'valid start and end query params (YYYY-MM-DD) are required' };
  }
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    ok: true,
    window: {
      start,
      end,
      endExclusiveIso: endExclusive.toISOString(),
    },
  };
}
