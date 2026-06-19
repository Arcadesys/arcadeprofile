import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import { isPublicPostStatus } from '@/lib/post-status';

export type Lane = 'fiction' | 'essays';

export const SCHEDULE: Record<number, Lane> = {
  0: 'fiction',
  1: 'essays',
  2: 'fiction',
  3: 'essays',
  4: 'fiction',
};

// Vercel functions run in UTC; the editorial workflow runs in the site's local TZ.
// Anchor "today" and weekday labels here so a 9pm Eastern reorder doesn't roll
// into tomorrow's slot.
export const SITE_TZ = process.env.SITE_TZ ?? 'America/New_York';

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
  weekdayLabel: string;
}

export function computeSchedule(
  fictionIds: string[],
  essaysIds: string[],
  from: Date = new Date(),
  tz: string = SITE_TZ,
  takenDates?: ReadonlySet<string>,
): Map<string, ComputedSlot> {
  const out = new Map<string, ComputedSlot>();
  let fi = 0;
  let ei = 0;
  const it = slots(from, tz);
  while (fi < fictionIds.length || ei < essaysIds.length) {
    const next = it.next();
    if (next.done) break;
    const { date, lane, weekdayMonZero } = next.value;
    const slot = {
      date: isoFromParts({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }),
      weekdayLabel: formatWeekdayLabel(weekdayMonZero, lane),
    };
    if (takenDates?.has(slot.date)) continue;
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

async function loadPostsLite(payload: Pick<Payload, 'find'>, ids: Array<string | number>): Promise<Map<string, Post>> {
  if (ids.length === 0) return new Map();
  const res = await payload.find({
    collection: 'posts',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
  });
  const map = new Map<string, Post>();
  for (const doc of res.docs as Post[]) {
    map.set(String(doc.id), doc);
  }
  return map;
}

export async function syncQueueToPosts(
  payload: Pick<Payload, 'find' | 'update'>,
  prev: QueueDiffPrev,
  next: QueueDiffNext,
  from: Date = new Date(),
  takenDates?: ReadonlySet<string>,
): Promise<void> {
  const schedule = computeSchedule(next.fictionIds, next.essaysIds, from, SITE_TZ, takenDates);

  const nextSet = new Set([...next.fictionIds, ...next.essaysIds]);
  const removed = [...new Set([...prev.fictionIds, ...prev.essaysIds])].filter((id) => !nextSet.has(id));

  const allIds = [...nextSet, ...removed];
  const posts = await loadPostsLite(payload, allIds);

  // Posts.afterChange hooks are safe under concurrent updates: revalidate uses
  // next/server.after to defer path invalidation, and newsletter fanout only
  // fires on transitions to published/sent (Hopper writes scheduled/draft).
  const updates: Promise<unknown>[] = [];

  for (const id of nextSet) {
    const post = posts.get(id);
    if (!post) continue;
    if (isPublicPostStatus(post.publish_status)) continue;
    const slot = schedule.get(id);
    if (!slot) continue;
    if (post.publish_status === 'scheduled' && post.scheduledPublishDate?.slice(0, 10) === slot.date) {
      continue;
    }
    updates.push(
      payload.update({
        collection: 'posts',
        id,
        data: {
          publish_status: 'scheduled',
          scheduledPublishDate: slot.date,
        },
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
