import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import { loadLiveQueueIds } from '@/lib/hopper/loadQueue';
import { loadPublishedTodayTakenDates } from '@/lib/hopper/publishedToday';
import { syncQueueToPosts } from '@/lib/hopper/syncSchedule';
import { logger } from '@/lib/logger';
import { prePublicOrMissingPostStatusClauses, publicPostStatuses } from '@/lib/post-status';
import {
  deliverPostNewsletter,
  type NewsletterDeliveryOutcome,
  type NewsletterSendState,
} from '@/lib/post-newsletter-delivery';
import { reconcileNewsletters, type ReconcileResult } from '@/lib/newsletter-reconcile';

export type PublishResult = {
  id: number;
  slug: string;
  status: 'published' | 'failed';
  error?: string;
  newsletter?: 'sent' | 'failed' | 'skipped';
  newsletterError?: string;
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
  undelivered: number;
  results: PublishResult[];
  stuckPosts: StuckPost[];
  undeliveredPosts: ReconcileResult['undeliveredPosts'];
};

// Posts whose scheduled date is older than this and still aren't public are
// flagged as stuck. The grace window absorbs normal cron-run jitter (GitHub
// Actions schedules can lag 10+ minutes) and the time it takes a single run
// to flip its due posts.
const STUCK_GRACE_MS = 60 * 60 * 1000;
const PENDING_NEWSLETTER_RETRY_GRACE_MS = 15 * 60 * 1000;

// Subset of the Payload local API we use. Typed via Pick so the route can
// pass a real Payload instance and tests can pass a structural mock.
// findGlobal is used by the queue-sync self-heal step before the publish loop.
export type PayloadLike = Pick<Payload, 'create' | 'find' | 'findByID' | 'update' | 'findGlobal'>;

type Options = {
  now?: Date;
  perRunLimit?: number | null;
  deliverNewsletter?: typeof deliverPostNewsletter;
  reconcile?: typeof reconcileNewsletters;
};

function getNewsletterError(outcome: NewsletterDeliveryOutcome): string | undefined {
  return outcome.kind === 'failed' ? (outcome.state.lastError ?? 'Newsletter send failed') : undefined;
}

async function persistNewsletterOutcome(
  payload: PayloadLike,
  post: { id: number; slug: string },
  outcome: NewsletterDeliveryOutcome,
): Promise<Pick<PublishResult, 'newsletter' | 'newsletterError'>> {
  if (outcome.kind === 'skipped' && outcome.reason === 'already-delivered') {
    return { newsletter: 'skipped' };
  }

  const newsletterSend = outcome.state as NewsletterSendState;
  await payload.update({
    collection: 'posts',
    id: post.id,
    data: {
      ...(outcome.kind === 'sent' ? { publish_status: 'sent' } : {}),
      newsletterSend,
    },
    depth: 0,
    overrideAccess: true,
  });

  if (outcome.kind === 'sent') return { newsletter: 'sent' };
  if (outcome.kind === 'failed') {
    return {
      newsletter: 'failed',
      newsletterError: getNewsletterError(outcome),
    };
  }
  return { newsletter: 'skipped' };
}

function pendingNewsletterState(nowIso: string): NewsletterSendState {
  return {
    status: 'pending',
    lastSyncedAt: nowIso,
    lastError: null,
  };
}

export async function publishScheduledPosts(
  payload: PayloadLike,
  {
    now = new Date(),
    perRunLimit = null,
    deliverNewsletter = deliverPostNewsletter,
    reconcile = reconcileNewsletters,
  }: Options = {},
): Promise<PublishScheduledResponse> {
  const nowIso = now.toISOString();

  // Self-heal step. Rewrite each queued post's scheduledPublishDate from its
  // current position in the publish-queue global, so a post whose admin-set
  // date drifted from its queue slot (e.g. a manual sidebar date, or position
  // drift after earlier posts shipped) becomes due this run instead of jamming
  // indefinitely. syncQueueToPosts is idempotent — passing prev === next means
  // no "removed" branch fires, and rows already in sync are skipped.
  try {
    const { fictionIds, essaysIds } = await loadLiveQueueIds(payload);
    const takenDates = await loadPublishedTodayTakenDates(payload, now);
    await syncQueueToPosts(
      payload,
      { fictionIds, essaysIds },
      { fictionIds, essaysIds },
      now,
      takenDates,
      { includePastSlots: true, allowPastScheduledPublishDate: true },
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
        { or: prePublicOrMissingPostStatusClauses() },
      ],
    },
  });

  const duePosts = dueResult.docs;
  const duePostIds = new Set(duePosts.map((post) => post.id));
  const results: PublishResult[] = [];

  for (const post of duePosts) {
    try {
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          publish_status: 'published',
          publishedDate: post.scheduledPublishDate || nowIso,
          newsletterSend: pendingNewsletterState(nowIso),
        },
        depth: 0,
        overrideAccess: true,
      });

      const newsletterOutcome = await deliverNewsletter(payload, post.id);
      const newsletterResult = await persistNewsletterOutcome(payload, post, newsletterOutcome);

      results.push({
        id: post.id,
        slug: post.slug,
        status: 'published',
        ...newsletterResult,
      });
    } catch (error) {
      results.push({
        id: post.id,
        slug: post.slug,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Retry newsletters for already-published posts. Intentionally NOT gated on
  // `scheduledPublishDate` — a post published with no scheduled date (admin
  // immediate publish, legacy row) must still get its newsletter. Only `failed`
  // and stale `pending`/null are auto-retried; `undelivered` is left for the
  // reconciler + manual decision (fix-forward), and `submitted`/`delivered`/
  // `suppressed`/`skipped` are terminal here.
  const pendingRetryBefore = new Date(now.getTime() - PENDING_NEWSLETTER_RETRY_GRACE_MS).toISOString();
  const retryResult = await payload.find({
    collection: 'posts',
    depth: 0,
    // Cap retries per run so a large failed/pending backlog (e.g. after a
    // transient Postmark outage) doesn't make one cron run unbounded.
    ...(perRunLimit ? { limit: perRunLimit } : { pagination: false }),
    where: {
      and: [
        { publish_status: { equals: 'published' } },
        {
          or: [
            { 'newsletterSend.status': { equals: 'failed' } },
            {
              and: [
                { 'newsletterSend.status': { equals: 'pending' } },
                { 'newsletterSend.lastSyncedAt': { less_than: pendingRetryBefore } },
              ],
            },
            { 'newsletterSend.status': { equals: null } },
          ],
        },
      ],
    },
  });

  for (const post of retryResult.docs) {
    if (duePostIds.has(post.id)) continue;
    try {
      const newsletterOutcome = await deliverNewsletter(payload, post.id);
      const newsletterResult = await persistNewsletterOutcome(payload, post, newsletterOutcome);
      results.push({
        id: post.id,
        slug: post.slug,
        status: 'published',
        ...newsletterResult,
      });
    } catch (error) {
      results.push({
        id: post.id,
        slug: post.slug,
        status: 'published',
        newsletter: 'failed',
        newsletterError: error instanceof Error ? error.message : 'Unknown newsletter error',
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
            { publish_status: { not_in: [...publicPostStatuses] } },
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

  // Reconcile in-flight `submitted` attempts against Postmark's reality: confirm
  // delivery (self-heal to `delivered`) or flag phantom sends as `undelivered`.
  // Like stuck posts, undelivered is a *report* — it must not fail the run.
  let reconcileResult: ReconcileResult = {
    checked: 0,
    delivered: 0,
    undelivered: 0,
    undeliveredPosts: [],
  };
  try {
    reconcileResult = await reconcile(payload, { now: () => now });
  } catch (err) {
    logger.error({ err }, '[publish-scheduled] newsletter reconcile failed');
  }

  // With `pagination: false`, totalDocs may not be populated by every DB
  // adapter, so fall back to docs.length.
  const dueTotal = (dueResult.totalDocs ?? duePosts.length) + (retryResult.totalDocs ?? retryResult.docs.length);
  const stuckTotal = stuckResult.totalDocs ?? stuckResult.docs.length;

  return {
    due: dueTotal,
    processed,
    failed,
    skipped: Math.max(dueTotal - duePosts.length, 0),
    stuck: stuckTotal,
    undelivered: reconcileResult.undelivered,
    results,
    stuckPosts,
    undeliveredPosts: reconcileResult.undeliveredPosts,
  };
}
