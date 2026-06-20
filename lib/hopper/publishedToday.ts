import type { Payload } from 'payload';

import { publicPostStatusWhere } from '@/lib/post-status';
import type { Post } from '@/payload-types';

import { todayInSiteTz } from './syncSchedule';

export interface PublishedTodayResult {
  posts: Post[];
  takenDates: Set<string>;
  todayIso: string;
}

// Posts that already shipped today — surface them at the top of their lane so
// the editor can see "today's fiction already went out" without us re-injecting
// them into the writable queue. Pre-filter at the DB to a 36h window (covers
// any TZ offset between UTC and SITE_TZ) and then normalize each row to the
// site TZ for the actual "is it today" check.
export async function loadPublishedToday(
  payload: Pick<Payload, 'find'>,
  now: Date = new Date(),
): Promise<PublishedTodayResult> {
  const todayIso = todayInSiteTz(now);
  const lookbackStart = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const res = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { publish_status: publicPostStatusWhere() },
        { publishedDate: { greater_than_equal: lookbackStart } },
      ],
    },
    depth: 0,
    sort: '-publishedDate',
    pagination: false,
  });
  const posts = (res.docs as Post[]).filter(
    (p) => typeof p.publishedDate === 'string' && todayInSiteTz(new Date(p.publishedDate)) === todayIso,
  );
  const takenDates = new Set<string>();
  for (const p of posts) {
    if (typeof p.publishedDate === 'string') {
      takenDates.add(todayInSiteTz(new Date(p.publishedDate)));
    }
  }
  return { posts, takenDates, todayIso };
}

export async function loadPublishedTodayTakenDates(
  payload: Pick<Payload, 'find'>,
  now: Date = new Date(),
): Promise<Set<string>> {
  const { takenDates } = await loadPublishedToday(payload, now);
  return takenDates;
}
