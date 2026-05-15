import type { Payload } from 'payload';

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
export async function loadPublishedToday(payload: Payload): Promise<PublishedTodayResult> {
  const todayIso = todayInSiteTz();
  const lookbackStart = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const res = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { publish_status: { in: ['published', 'sent'] } },
        { publishedDate: { greater_than_equal: lookbackStart } },
      ],
    },
    limit: 50,
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

export async function loadPublishedTodayTakenDates(payload: Payload): Promise<Set<string>> {
  const { takenDates } = await loadPublishedToday(payload);
  return takenDates;
}
