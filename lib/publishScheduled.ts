import type { Payload } from 'payload';

import type { Post } from '@/payload-types';

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
export type PayloadLike = Pick<Payload, 'find' | 'update'>;

type Options = {
  now?: Date;
  perRunLimit?: number | null;
};

export async function publishScheduledPosts(
  payload: PayloadLike,
  { now = new Date(), perRunLimit = null }: Options = {},
): Promise<PublishScheduledResponse> {
  const nowIso = now.toISOString();

  const dueResult = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: perRunLimit || 0,
    sort: ['scheduledPublishDate', 'order'],
    where: {
      and: [
        { publish_status: { equals: 'scheduled' } },
        { scheduledPublishDate: { less_than_equal: nowIso } },
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
    limit: 0,
    where: {
      and: [
        { scheduledPublishDate: { less_than: stuckThreshold } },
        { publish_status: { not_in: ['published', 'sent'] } },
      ],
    },
  });

  const stuckPosts: StuckPost[] = stuckResult.docs.map((post) => ({
    id: post.id,
    slug: post.slug,
    publish_status: post.publish_status,
    scheduledPublishDate: post.scheduledPublishDate,
  }));

  return {
    due: dueResult.totalDocs,
    processed,
    failed,
    skipped: Math.max(dueResult.totalDocs - duePosts.length, 0),
    stuck: stuckResult.totalDocs,
    results,
    stuckPosts,
  };
}
