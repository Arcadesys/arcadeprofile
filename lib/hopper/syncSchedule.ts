import type { Post } from '@/payload-types';
import { isoDateOnlyToScheduledIso } from '@/lib/iso-date';
import { isPublicPostStatus } from '@/lib/post-status';
import { SITE_TZ, datePartsInTimeZone, isoDateFromParts } from '@/lib/site-time';
import { isChapterSerialSchedule, type ChapterSerialSchedule, zonedDateTimeToUtc } from '@/lib/serial-schedule';

export { todayInSiteTz } from '@/lib/site-time';

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
  return datePartsInTimeZone(d, tz);
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

export interface QueueSchedulePost {
  id: string;
  group?: string | null;
}

export interface ComputeScheduleOptions {
  includePastSlots?: boolean;
  publishHourUtc?: number;
}

export function scheduledPublishDateForSlot(
  date: string,
  publishHourUtc: number = DEFAULT_PUBLISH_HOUR_UTC,
): string {
  const scheduledIso = isoDateOnlyToScheduledIso(date, publishHourUtc);
  if (!scheduledIso) {
    throw new Error(`Invalid slot date: ${date}`);
  }
  return scheduledIso;
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
    const slotDate = isoDateFromParts({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    });
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

/** Schedule chapter-first serials on Monday before allocating legacy fiction. */
export function computeGroupAwareSchedule(
  fiction: QueueSchedulePost[],
  essays: QueueSchedulePost[],
  serialSchedules: ReadonlyMap<string, ChapterSerialSchedule>,
  from: Date = new Date(),
  tz: string = SITE_TZ,
  takenDates: ReadonlySet<string> = new Set(),
  includePastSlots = false,
): Map<string, ComputedSlot> {
  const out = new Map<string, ComputedSlot>();
  const serial = fiction.filter((post) => post.group && isChapterSerialSchedule(serialSchedules.get(post.group)));
  const legacyFiction = fiction.filter((post) => !serial.includes(post));
  let serialIndex = 0;
  let fictionIndex = 0;
  let essayIndex = 0;
  const start = datePartsInTimeZone(from, tz);
  const cursor = new Date(start.year, start.month - 1, start.day);

  while (serialIndex < serial.length || fictionIndex < legacyFiction.length || essayIndex < essays.length) {
    const dow = (cursor.getDay() + 6) % 7;
    const date = isoDateFromParts({ year: cursor.getFullYear(), month: cursor.getMonth() + 1, day: cursor.getDate() });
    const available = !takenDates.has(date);
    let post: QueueSchedulePost | undefined;
    let slot: ComputedSlot | null = null;

    if (dow === 0 && serialIndex < serial.length && available) {
      post = serial[serialIndex]!;
      const serialSchedule = serialSchedules.get(post.group!)!;
      const scheduledPublishDate = zonedDateTimeToUtc(date, serialSchedule.time ?? undefined, tz);
      if (scheduledPublishDate) slot = { date, scheduledPublishDate, weekdayLabel: 'Mon · Chapter serial' };
    } else if ((dow === 0 || dow === 2 || dow === 4) && fictionIndex < legacyFiction.length && available) {
      post = legacyFiction[fictionIndex]!;
      slot = { date, scheduledPublishDate: scheduledPublishDateForSlot(date), weekdayLabel: formatWeekdayLabel(dow, 'fiction') };
    } else if ((dow === 1 || dow === 3) && essayIndex < essays.length && available) {
      post = essays[essayIndex]!;
      slot = { date, scheduledPublishDate: scheduledPublishDateForSlot(date), weekdayLabel: formatWeekdayLabel(dow, 'essays') };
    }
    if (post && slot && (includePastSlots || new Date(slot.scheduledPublishDate).getTime() > from.getTime())) {
      out.set(post.id, slot);
      if (serial.includes(post)) serialIndex++;
      else if (legacyFiction.includes(post)) fictionIndex++;
      else essayIndex++;
    }
    cursor.setDate(cursor.getDate() + 1);
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
  serialSchedules?: ReadonlyMap<string, ChapterSerialSchedule>;
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

type QueueSyncPost = Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate' | 'group'>;

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
  const nextSet = new Set([...next.fictionIds, ...next.essaysIds]);
  const removed = [...new Set([...prev.fictionIds, ...prev.essaysIds])].filter((id) => !nextSet.has(id));

  const allIds = [...nextSet, ...removed];
  const posts = await loadPostsLite(payload, allIds);
  const schedule = computeGroupAwareSchedule(
    next.fictionIds.map((id) => ({ id, group: posts.get(id)?.group })),
    next.essaysIds.map((id) => ({ id, group: posts.get(id)?.group })),
    options.serialSchedules ?? new Map(),
    from,
    SITE_TZ,
    takenDates,
    options.includePastSlots ?? false,
  );

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
