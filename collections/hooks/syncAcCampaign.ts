import type { CollectionAfterChangeHook } from 'payload';

import type { Post } from '../../payload-types';
import {
  syncPostCampaign,
  type PostAcCampaignState,
  type SyncOutcome,
} from '../../lib/post-campaign-sync';
import { buildPostNewsletterContent } from '../../lib/newsletter';
import { resolveGroupHeroForPost } from '../../lib/post-newsletter';

type HookContext = { skipNewsletter?: boolean } | undefined;

/**
 * Reconciles the post's AC campaign with `scheduledPublishDate` on every
 * save. Detached via `next/server.after` because the AC round-trip can take
 * several seconds; we do not want to wedge the admin save modal on it.
 *
 * What we do NOT do here: pre-filter on `publish_status`. The new model
 * provisions the campaign as soon as `scheduledPublishDate` is set — even
 * for drafts — so editors can stage everything ahead of time. `syncPostCampaign`
 * owns the no-op / failure / steady-state branching.
 */
export const syncAcCampaignHook: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if ((context as HookContext)?.skipNewsletter) return doc;

  const payload = req.payload;
  const postId = doc.id as number;

  if (!doc.scheduledPublishDate) {
    return doc;
  }

  const previousScheduled = previousDoc?.scheduledPublishDate ?? null;
  const previousSuppress = previousDoc?.suppressNewsletter ?? false;
  const previousCampaignId = previousDoc?.acCampaign?.campaignId ?? null;

  // Skip work when nothing the sync cares about has changed AND we already
  // have a campaign on file. First-time runs (no campaignId) always proceed
  // so a brand-new post still gets provisioned.
  const nothingRelevantChanged =
    previousCampaignId &&
    previousScheduled === doc.scheduledPublishDate &&
    previousSuppress === Boolean(doc.suppressNewsletter);

  if (nothingRelevantChanged) {
    return doc;
  }

  const runSync = async () => {
    let populated: Post;
    try {
      populated = (await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 1,
        overrideAccess: true,
      })) as Post;
    } catch (err) {
      console.error(
        '[ac-sync] Failed to load post; skipping campaign sync:',
        err instanceof Error ? err.message : err,
      );
      return;
    }

    const postSlug = populated.slug as string;
    const postTitle = populated.title as string;
    const postGroup = typeof populated.group === 'string' ? populated.group : '';
    const subject = (populated.newsletterHeading as string) || postTitle;

    const scheduledRaw = populated.scheduledPublishDate;
    if (typeof scheduledRaw !== 'string' || !scheduledRaw) return;
    const scheduledPublishDate = new Date(scheduledRaw);
    if (Number.isNaN(scheduledPublishDate.getTime())) return;

    let groupCategory: string | null = null;
    if (postGroup) {
      try {
        const groupLookup = await payload.find({
          collection: 'groups',
          where: { slug: { equals: postGroup } },
          limit: 1,
          overrideAccess: true,
        });
        groupCategory =
          (groupLookup.docs[0]?.category as string | undefined) ?? null;
      } catch (err) {
        console.error(
          '[ac-sync] Failed to load group category; treating as null:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    let htmlBody = '';
    let textBody = '';
    try {
      const group = await resolveGroupHeroForPost(payload, populated);
      const rendered = buildPostNewsletterContent({ ...populated, group });
      htmlBody = rendered.htmlBody;
      textBody = rendered.textBody;
    } catch (err) {
      console.error(
        '[ac-sync] Failed to render newsletter content:',
        err instanceof Error ? err.message : err,
      );
      // Don't bail — `syncPostCampaign` may still find a no-op or reschedule
      // path that doesn't need the body. For first-time creates this means
      // AC will receive empty bodies; the failure surface still surfaces.
    }

    const existingAc =
      (populated.acCampaign as PostAcCampaignState | null | undefined) ?? null;

    let outcome: SyncOutcome;
    try {
      outcome = await syncPostCampaign(
        {
          slug: postSlug,
          subject,
          htmlBody,
          textBody,
          scheduledPublishDate,
          groupCategory,
          acCampaign: existingAc,
          suppressNewsletter: populated.suppressNewsletter ?? undefined,
        },
      );
    } catch (err) {
      console.error(
        '[ac-sync] syncPostCampaign threw (should not happen):',
        err instanceof Error ? err.message : err,
      );
      return;
    }

    if (outcome.kind === 'skipped') {
      console.log(
        `[ac-sync] post=${postId} slug=${postSlug} skipped: ${outcome.reason}`,
      );
      return;
    }

    try {
      await payload.update({
        collection: 'posts',
        id: postId,
        // `context.skipNewsletter` prevents the recursive sync from this very
        // write triggering another AC round-trip.
        context: { skipNewsletter: true },
        data: {
          acCampaign: outcome.state as Post['acCampaign'],
        },
      });
    } catch (err) {
      console.error(
        '[ac-sync] Failed to persist acCampaign state:',
        err instanceof Error ? err.message : err,
      );
      return;
    }

    if (outcome.kind === 'failed') {
      console.error(
        `[ac-sync] post=${postId} slug=${postSlug} FAILED:`,
        outcome.state.lastError,
      );
      return;
    }
    if (outcome.kind === 'already-sent') {
      console.warn(
        `[ac-sync] post=${postId} slug=${postSlug} already-sent: date change not propagated`,
      );
      return;
    }
    console.log(
      `[ac-sync] post=${postId} slug=${postSlug} ${outcome.kind}: campaign=${outcome.state.campaignId} scheduledFor=${outcome.state.scheduledFor}`,
    );
  };

  const fireAndForget = () => {
    void runSync().catch((err) => {
      console.error('[ac-sync] background sync crashed:', err);
    });
  };
  try {
    const nextServer = await import('next/server');
    if (typeof nextServer.after === 'function') {
      nextServer.after(runSync);
    } else {
      fireAndForget();
    }
  } catch {
    fireAndForget();
  }

  return doc;
};
