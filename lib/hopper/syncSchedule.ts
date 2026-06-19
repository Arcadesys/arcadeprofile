import type { Post } from '@/payload-types';
import { isPublicPostStatus } from '@/lib/post-status';
import { SITE_TZ } from '@/lib/site-time';

export type Lane = 'fiction' | 'essays';

export const SCHEDULE: Record<number, Lane> = {
  0: 'fiction',
  1: 'essays',
  2: 'fiction',
  3: 'essays',
  4: 'fiction',
};

// Vercel functions run in UTC; the editorial workflow runs in the site's local TZ.
// Anchor "today" and weekday labels here so a late-night reorder doesn't roll
// into tomorrow's slot.
export const DEFAULT_PUBLISH_HOUR_UTC = 14;

export const WEEKDAY_LABEL: Record<number, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
};

function formatWeekdayLabel(weekdayMonZero: number, lane: Lane): string {
  return `${WEEKDAY_LABEL[weekdayMonZero] ?? ''} · ${LANE_LABEL[lane]}`;
}

const LANE_LABEL: Record<Lane, string> = {
  fiction: 'Fiction',
  essays: 'Essays',
};

interface DateParts {
  year: number;
  month: number;
  day: number;
  weekdayMonZero: number; // Mon=0..Sun=6
}

function partsInTz(d: Date, tz: string): DateParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) map[p.type] = p.value;
  const weekdayShortToMonZero: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekdayMonZero: weekdayShortToMonZero[map.weekday!] ?? 0,
  };
}

function isoFromParts(p: Pick<DateParts, 'year' | 'month' | 'day'>): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function todayInSiteTz(now: Date = new Date(), tz: string = SITE_TZ): string {
  return isoFromParts(partsInTz(now, tz));
}

export function weekdayLabel(date: Date, lane: Lane, tz: string = SITE_TZ): string {
  const { weekdayMonZero } = partsInTz(date, tz);
  const day = WEEKDAY_LABEL[weekdayMonZero] ?? '';
  return `${day} · ${LANE_LABEL[lane]}`;
}

export function* slots(
  from: Date,
  tz: string = SITE_TZ,
): Generator<{ date: Date; lane: Lane; weekdayMonZero: number }> {
  // Use the date components in the site TZ as the cursor; date math stays in
  // local-Date land (where DST shifts are absorbed by Date.setDate).
  const start = partsInTz(from, tz);
  const cursor = new Date(start.year, start.month - 1, start.day);
  while (true) {
    const dow = (cursor.getDay() + 6) % 7;
    const lane = SCHEDULE[dow];
    if (lane) {
      yield { date: new Date(cursor), lane, weekdayMonZero: dow };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

export interface ComputedSlot {
  date: string;
  scheduledPublishDate: string;
  weekdayLabel: string;
}

export interface ComputeScheduleOptions {
  includePastSlots?: boolean;
  publishHourUtc?: number;
}

export function scheduledPublishDateForSlot(
  date: string,
  publishHourUtc: number = DEFAULT_PUBLISH_HOUR_UTC,
): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, publishHourUtc, 0, 0, 0)).toISOString();
}

export function computeSchedule(
  fictionIds: string[],
  essaysIds: string[],
  from: Date = new Date(),
  tz: string = SITE_TZ,
  takenDates?: ReadonlySet<string>,
  options: ComputeScheduleOptions = {},
): Map<string, ComputedSlot> {
  const out = new Map<string, ComputedSlot>();
  let fi = 0;
  let ei = 0;
  const includePastSlots = options.includePastSlots ?? true;
  const publishHourUtc = options.publishHourUtc ?? DEFAULT_PUBLISH_HOUR_UTC;
  const it = slots(from, tz);
  while (fi < fictionIds.length || ei < essaysIds.length) {
    const next = it.next();
    if (next.done) break;
    const { date, lane, weekdayMonZero } = next.value;
    const slotDate = isoFromParts({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
    const scheduledPublishDate = scheduledPublishDateForSlot(slotDate, publishHourUtc);
    const slot = {
      date: slotDate,
      scheduledPublishDate,
      weekdayLabel: formatWeekdayLabel(weekdayMonZero, lane),
    };
    if (takenDates?.has(slot.date)) continue;
    if (!includePastSlots && new Date(scheduledPublishDate).getTime() <= from.getTime()) continue;
    if (lane === 'fiction' && fi < fictionIds.length) {
      out.set(fictionIds[fi]!, slot);
      fi++;
    } else if (lane === 'essays' && ei < essaysIds.length) {
      out.set(essaysIds[ei]!, slot);
      ei++;
    }
  }
  return out;
}

export interface QueueDiffPrev {
  fictionIds: string[];
  essaysIds: string[];
}

export interface QueueDiffNext {
  fictionIds: string[];
  essaysIds: string[];
}

interface SyncQueueOptions extends ComputeScheduleOptions {
  allowPastScheduledPublishDate?: boolean;
}

type QueueSyncPayload = {
  find(args: {
    collection: 'posts';
    where: { id: { in: Array<string | number> } };
    limit: number;
    depth: 0;
    pagination: false;
  }): Promise<{ docs: QueueSyncPost[] }>;
  update(args: {
    collection: 'posts';
    id: string | number;
    data: {
      publish_status?: 'scheduled' | 'draft';
      scheduledPublishDate?: string | null;
    };
    context?: { allowPastScheduledPublishDate: true };
  }): Promise<unknown>;
};

type QueueSyncPost = Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate'>;

async function loadPostsLite(payload: Pick<QueueSyncPayload, 'find'>, ids: Array<string | number>): Promise<Map<string, QueueSyncPost>> {
  if (ids.length === 0) return new Map();
  const res = await payload.find({
    collection: 'posts',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
  });
  const map = new Map<string, QueueSyncPost>();
  for (const doc of res.docs) {
    map.set(String(doc.id), doc);
  }
  return map;
}

function sameScheduledInstant(existing: string | null | undefined, expected: string): boolean {
  if (!existing) return false;
  const existingMs = Date.parse(existing);
  const expectedMs = Date.parse(expected);
  return !Number.isNaN(existingMs) && existingMs === expectedMs;
}

export async function syncQueueToPosts(
  payload: QueueSyncPayload,
  prev: QueueDiffPrev,
  next: QueueDiffNext,
  from: Date = new Date(),
  takenDates?: ReadonlySet<string>,
  options: SyncQueueOptions = {},
): Promise<void> {
  const schedule = computeSchedule(next.fictionIds, next.essaysIds, from, SITE_TZ, takenDates, {
    includePastSlots: options.includePastSlots ?? false,
    publishHourUtc: options.publishHourUtc,
  });

  const nextSet = new Set([...next.fictionIds, ...next.essaysIds]);
  const removed = [...new Set([...prev.fictionIds, ...prev.essaysIds])].filter((id) => !nextSet.has(id));

  const allIds = [...nextSet, ...removed];
  const posts = await loadPostsLite(payload, allIds);

  // Posts.afterChange hooks are safe under concurrent updates: revalidation
  // uses next/server.after, and Hopper only writes scheduled/draft state.
  const updates: Promise<unknown>[] = [];

  for (const id of nextSet) {
    const post = posts.get(id);
    if (!post) continue;
    if (isPublicPostStatus(post.publish_status)) continue;
    const slot = schedule.get(id);
    if (!slot) continue;
    if (
      post.publish_status === 'scheduled' &&
      sameScheduledInstant(post.scheduledPublishDate, slot.scheduledPublishDate)
    ) {
      continue;
    }
    updates.push(
      payload.update({
        collection: 'posts',
        id,
        data: {
          publish_status: 'scheduled',
          scheduledPublishDate: slot.scheduledPublishDate,
        },
        ...(options.allowPastScheduledPublishDate
          ? { context: { allowPastScheduledPublishDate: true } }
          : {}),
      }),
    );
  }

  for (const id of removed) {
    const post = posts.get(id);
    if (!post) continue;
    if (post.publish_status !== 'scheduled') continue;
    updates.push(
      payload.update({
        collection: 'posts',
        id,
        data: {
          publish_status: 'draft',
          scheduledPublishDate: null,
        },
      }),
    );
  }

  await Promise.all(updates);
}
