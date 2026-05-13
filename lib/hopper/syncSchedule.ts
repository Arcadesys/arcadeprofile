import type { Payload } from 'payload';

export type Lane = 'fiction' | 'essays';

export const SCHEDULE: Record<number, Lane> = {
  0: 'fiction',
  1: 'essays',
  2: 'fiction',
  3: 'essays',
  4: 'fiction',
};

const WEEKDAY_LABEL: Record<number, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
};

const LANE_LABEL: Record<Lane, string> = {
  fiction: 'Fiction',
  essays: 'Essays',
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekdayLabel(date: Date, lane: Lane): string {
  // getDay: Sun=0..Sat=6. Convert to Mon=0..Fri=4.
  const dow = (date.getDay() + 6) % 7;
  const day = WEEKDAY_LABEL[dow] ?? '';
  return `${day} · ${LANE_LABEL[lane]}`;
}

export function* slots(from: Date): Generator<{ date: Date; lane: Lane }> {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // Unbounded; callers stop when both queues are consumed.
  while (true) {
    const dow = (cursor.getDay() + 6) % 7;
    const lane = SCHEDULE[dow];
    if (lane) {
      yield { date: new Date(cursor), lane };
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
): Map<string, ComputedSlot> {
  const out = new Map<string, ComputedSlot>();
  let fi = 0;
  let ei = 0;
  const it = slots(from);
  while (fi < fictionIds.length || ei < essaysIds.length) {
    const next = it.next();
    if (next.done) break;
    const { date, lane } = next.value;
    if (lane === 'fiction' && fi < fictionIds.length) {
      out.set(fictionIds[fi]!, { date: isoDate(date), weekdayLabel: weekdayLabel(date, lane) });
      fi++;
    } else if (lane === 'essays' && ei < essaysIds.length) {
      out.set(essaysIds[ei]!, { date: isoDate(date), weekdayLabel: weekdayLabel(date, lane) });
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

interface PostLite {
  id: string | number;
  publish_status?: string | null;
  scheduledPublishDate?: string | null;
}

async function loadPostsLite(payload: Payload, ids: Array<string | number>): Promise<Map<string, PostLite>> {
  if (ids.length === 0) return new Map();
  const res = await payload.find({
    collection: 'posts',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
  });
  const map = new Map<string, PostLite>();
  for (const doc of res.docs) {
    map.set(String((doc as { id: string | number }).id), doc as unknown as PostLite);
  }
  return map;
}

export async function syncQueueToPosts(
  payload: Payload,
  prev: QueueDiffPrev,
  next: QueueDiffNext,
  from: Date = new Date(),
): Promise<void> {
  const schedule = computeSchedule(next.fictionIds, next.essaysIds, from);

  const nextSet = new Set([...next.fictionIds, ...next.essaysIds]);
  const removed = [...new Set([...prev.fictionIds, ...prev.essaysIds])].filter((id) => !nextSet.has(id));

  const allIds = [...nextSet, ...removed];
  const posts = await loadPostsLite(payload, allIds);

  for (const id of nextSet) {
    const post = posts.get(id);
    if (!post) continue;
    if (post.publish_status === 'published' || post.publish_status === 'sent') continue;
    const slot = schedule.get(id);
    if (!slot) continue;
    if (post.publish_status === 'scheduled' && post.scheduledPublishDate?.slice(0, 10) === slot.date) {
      continue;
    }
    await payload.update({
      collection: 'posts',
      id,
      data: {
        publish_status: 'scheduled',
        scheduledPublishDate: slot.date,
      },
    });
  }

  for (const id of removed) {
    const post = posts.get(id);
    if (!post) continue;
    if (post.publish_status !== 'scheduled') continue;
    await payload.update({
      collection: 'posts',
      id,
      data: {
        publish_status: 'draft',
        scheduledPublishDate: null,
      },
    });
  }
}
