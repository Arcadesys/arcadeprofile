import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import { loadLiveQueueIds } from '@/lib/hopper/loadQueue';
import { loadPublishedTodayTakenDates } from '@/lib/hopper/publishedToday';
import { syncQueueToPosts } from '@/lib/hopper/syncSchedule';
import { logger } from '@/lib/logger';

export type PublishResult = {
  id: number;
  slug: string;
  status: 'published' | 'failed';
  error?: string;
};

export type StuckPost = {
  id: number;
  slug: string;
  publish_status: Post['publish_status'];
  scheduledPublishDate: string | null | undefined;
};

export type PublishScheduledResponse = {
  due: number;
  processed: number;
  failed: number;
  skipped: number;
  stuck: number;
  results: PublishResult[];
  stuckPosts: StuckPost[];
};

// Posts whose scheduled date is older than this and still aren't public are
// flagged as stuck. The grace window absorbs normal cron-run jitter (GitHub
// Actions schedules can lag 10+ minutes) and the time it takes a single run
// to flip its due posts.
const STUCK_GRACE_MS = 60 * 60 * 1000;

// Subset of the Payload local API we use. Typed via Pick so the route can
// pass a real Payload instance and tests can pass a structural mock.
// findGlobal is used by the queue-sync self-heal step before the publish loop.
export type PayloadLike = Pick<Payload, 'find' | 'update' | 'findGlobal'>;

type Options = {
  now?: Date;
  perRunLimit?: number | null;
};

export async function publishScheduledPosts(
  payload: PayloadLike,
  { now = new Date(), perRunLimit = null }: Options = {},
): Promise<PublishScheduledResponse> {
  const nowIso = now.toISOString();

  // Self-heal step. Rewrite each queued post's scheduledPublishDate from its
  // current position in the publish-queue global, so a post whose admin-set
  // date drifted from its queue slot (e.g. a manual sidebar date, or position
  // drift after earlier posts shipped) becomes due this run instead of jamming
  // indefinitely. syncQueueToPosts is idempotent — passing prev === next means
  // no "removed" branch fires, and rows already in sync are skipped.
  try {
    const { fictionIds, essaysIds } = await loadLiveQueueIds(payload as Payload);
    const takenDates = await loadPublishedTodayTakenDates(payload as Payload);
    await syncQueueToPosts(
      payload as Payload,
      { fictionIds, essaysIds },
      { fictionIds, essaysIds },
      now,
      takenDates,
    );
  } catch (err) {
    // A sync failure must not block the publish loop — a stale row is
    // recoverable next run, a crashed cron is not.
    logger.error({ err }, '[publish-scheduled] queue sync failed');
  }

  // Include `draft` (and NULL) alongside `scheduled` so a post that has a
  // past scheduledPublishDate but never had its publish_status promoted by
  // the beforeChange hook (legacy rows, SQL-imported data, an admin who
  // cleared the dropdown) still gets published instead of jamming the run.
  const dueResult = await payload.find({
    collection: 'posts',
    depth: 0,
    sort: ['scheduledPublishDate', 'order'],
    ...(perRunLimit ? { limit: perRunLimit } : { pagination: false }),
    where: {
      and: [
        { scheduledPublishDate: { less_than_equal: nowIso } },
        {
          or: [
            { publish_status: { equals: 'scheduled' } },
            { publish_status: { equals: 'draft' } },
            { publish_status: { equals: null } },
          ],
        },
      ],
    },
  });

  const duePosts = dueResult.docs;
  const results: PublishResult[] = [];

  for (const post of duePosts) {
    try {
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          publish_status: 'published',
          publishedDate: post.scheduledPublishDate || nowIso,
        },
        depth: 0,
        overrideAccess: true,
      });

      results.push({ id: post.id, slug: post.slug, status: 'published' });
    } catch (error) {
      results.push({
        id: post.id,
        slug: post.slug,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const processed = results.filter((r) => r.status === 'published').length;
  const failed = results.length - processed;

  // Stuck detector: anything past its scheduled date by more than the grace
  // window that still isn't `published` or `sent`. Run AFTER the publish loop
  // so we don't flag posts we just promoted.
  const stuckThreshold = new Date(now.getTime() - STUCK_GRACE_MS).toISOString();
  const stuckResult = await payload.find({
    collection: 'posts',
    depth: 0,
    pagination: false,
    where: {
      and: [
        { scheduledPublishDate: { less_than: stuckThreshold } },
        // `not_in` doesn't match NULL rows in Postgres, so spell out the
        // null case explicitly — a missing publish_status with a past
        // scheduled date is just as stuck.
        {
          or: [
            { publish_status: { not_in: ['published', 'sent'] } },
            { publish_status: { equals: null } },
          ],
        },
      ],
    },
  });

  const stuckPosts: StuckPost[] = stuckResult.docs.map((post) => ({
    id: post.id,
    slug: post.slug,
    publish_status: post.publish_status,
    scheduledPublishDate: post.scheduledPublishDate,
  }));

  // With `pagination: false`, totalDocs may not be populated by every DB
  // adapter, so fall back to docs.length.
  const dueTotal = dueResult.totalDocs ?? duePosts.length;
  const stuckTotal = stuckResult.totalDocs ?? stuckResult.docs.length;

  return {
    due: dueTotal,
    processed,
    failed,
    skipped: Math.max(dueTotal - duePosts.length, 0),
    stuck: stuckTotal,
    results,
    stuckPosts,
  };
}
