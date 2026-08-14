import { randomUUID } from 'node:crypto';

import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';
import {
  ActiveCampaignError,
  resolveActiveCampaignRecipientsForLists,
  resolveAudienceListIds,
} from './activecampaign';
import { buildPostNewsletterContent } from './newsletter';
import { assertNewsletterConfigValid } from './postmark-config';
import { type NewsletterSendStatus } from './newsletter-status';
import { resolveGroupHeroForPost, resolveNewsletterContinuity } from './post-newsletter';
import {
  getPostmarkBroadcastMessageStream,
  LinkTrackingOptions,
  PostmarkBatchSendError,
  type PostmarkTrackLinks,
  sendPostmarkNewsletterEmail,
} from './postmark';
import {
  ATTEMPT_ID_METADATA_KEY,
  recordPostmarkSubmittedMessages,
  submittedRecipientsForAttempt,
  summarizePostmarkEvents,
} from './postmark-events';

export interface NewsletterSendState {
  attemptId?: string | null;
  messageId?: string | null;
  status?: NewsletterSendStatus | null;
  targetedLists?: string | null;
  recipientCount?: number | null;
  acceptedCount?: number | null;
  failedCount?: number | null;
  deliveredCount?: number | null;
  bouncedCount?: number | null;
  openedCount?: number | null;
  clickedCount?: number | null;
  complainedCount?: number | null;
  sentAt?: string | null;
  lastSyncedAt?: string | null;
  lastEventAt?: string | null;
  undeliveredAt?: string | null;
  lastError?: string | null;
}

export type NewsletterDeliveryOutcome =
  | { kind: 'sent'; state: NewsletterSendState }
  | { kind: 'failed'; state: NewsletterSendState; error: unknown }
  | { kind: 'skipped'; reason: string; state: NewsletterSendState };

export type NewsletterDeliveryPayload = Pick<Payload, 'create' | 'find' | 'findByID' | 'update'>;
type PopulatedPostGroup = Pick<Group, 'category' | 'slug'>;
type NewsletterPost = Omit<Post, 'group'> & {
  group?: Post['group'] | PopulatedPostGroup | null;
};

type Deps = {
  resolveRecipients?: typeof resolveActiveCampaignRecipientsForLists;
  sendEmail?: typeof sendPostmarkNewsletterEmail;
  now?: () => Date;
  generateAttemptId?: (post: Pick<Post, 'id'>) => string;
};

function describeError(err: unknown): string {
  if (err instanceof ActiveCampaignError) {
    const detail = err.details ? ` | ${err.details}` : '';
    const status = err.causeStatus !== undefined ? ` (HTTP ${err.causeStatus})` : '';
    return `${err.message}${status}${detail}`.slice(0, 2000);
  }
  if (err instanceof Error) return err.message.slice(0, 2000);
  return String(err).slice(0, 2000);
}

function joinIds(ids: string[]): string {
  return ids.join(',');
}

function getPostGroupSlug(group: NewsletterPost['group']): string | null {
  if (!group) return null;
  if (typeof group === 'string') return group.trim() || null;
  return group.slug?.trim() || null;
}

function defaultAttemptId(post: Pick<Post, 'id'>): string {
  return `post-${post.id}-${randomUUID()}`;
}

function getNewsletterTrackOpens(): boolean | undefined {
  if (process.env.POSTMARK_TRACK_OPENS === 'true') return true;
  if (process.env.POSTMARK_TRACK_OPENS === 'false') return false;
  return undefined;
}

function getNewsletterTrackLinks(): PostmarkTrackLinks | undefined {
  const value = process.env.POSTMARK_TRACK_LINKS;
  if (value === 'None') return LinkTrackingOptions.None;
  if (value === 'HtmlAndText') return LinkTrackingOptions.HtmlAndText;
  if (value === 'HtmlOnly') return LinkTrackingOptions.HtmlOnly;
  if (value === 'TextOnly') return LinkTrackingOptions.TextOnly;
  return LinkTrackingOptions.None;
}

function buildNewsletterMetadata(
  post: Pick<Post, 'id' | 'slug'>,
  listIds: string[],
  attemptId: string,
): Record<string, string> {
  return {
    postId: String(post.id),
    postSlug: post.slug,
    audienceListIds: joinIds(listIds),
    [ATTEMPT_ID_METADATA_KEY]: attemptId,
  };
}

/**
 * Build the denormalized send state from the attempt-scoped Postmark event
 * summary. Status is derived from real counts (submitted vs delivered) — never
 * from historical events outside the current attempt.
 */
async function computeSendState(
  payload: NewsletterDeliveryPayload,
  post: Pick<Post, 'id'>,
  attemptId: string,
  base: NewsletterSendState,
): Promise<NewsletterSendState> {
  const summary = await summarizePostmarkEvents(payload, post.id, attemptId);
  const acceptedCount = summary.acceptedCount;
  const status: NewsletterSendStatus =
    acceptedCount > 0 && summary.deliveredCount + summary.bouncedCount >= acceptedCount
      ? 'delivered'
      : 'submitted';
  return {
    ...base,
    attemptId,
    status,
    messageId: joinIds(summary.messageIds),
    acceptedCount,
    deliveredCount: summary.deliveredCount,
    bouncedCount: summary.bouncedCount,
    openedCount: summary.openedCount,
    clickedCount: summary.clickedCount,
    complainedCount: summary.complainedCount,
    lastEventAt: summary.lastEventAt,
    undeliveredAt: null,
    lastError: null,
  };
}

async function resolveGroupCategory(
  payload: NewsletterDeliveryPayload,
  groupSlug: string,
): Promise<string | null> {
  if (!groupSlug) return null;
  const groupLookup = await payload.find({
    collection: 'groups',
    where: { slug: { equals: groupSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (groupLookup.docs[0]?.category as string | undefined) ?? null;
}

export async function deliverPostNewsletter(
  payload: NewsletterDeliveryPayload,
  postId: number,
  deps: Deps = {},
): Promise<NewsletterDeliveryOutcome> {
  const now = deps.now ?? (() => new Date());
  const resolveRecipients = deps.resolveRecipients ?? resolveActiveCampaignRecipientsForLists;
  const sendEmail = deps.sendEmail ?? sendPostmarkNewsletterEmail;
  const generateAttemptId = deps.generateAttemptId ?? defaultAttemptId;

  const post = (await payload.findByID({
    collection: 'posts',
    id: postId,
    depth: 1,
    overrideAccess: true,
  })) as NewsletterPost;

  const existing = (post.newsletterSend as NewsletterSendState | null | undefined) ?? null;
  const nowIso = now().toISOString();

  if (post.suppressNewsletter) {
    return {
      kind: 'skipped',
      reason: 'suppressNewsletter',
      state: {
        ...existing,
        status: 'suppressed',
        lastSyncedAt: nowIso,
        lastError: null,
      },
    };
  }

  // Only `delivered` is a hard stop. failed/undelivered/submitted are
  // re-attemptable (subject to the scheduler's retry policy); a freshly
  // published post is `pending`.
  if (existing?.status === 'delivered') {
    return {
      kind: 'skipped',
      reason: 'already-delivered',
      state: existing,
    };
  }

  // Reuse the in-flight attempt id (crash-safe resume); otherwise mint one.
  const attemptId =
    typeof existing?.attemptId === 'string' && existing.attemptId.trim()
      ? existing.attemptId
      : generateAttemptId(post);

  try {
    // Fail loud on misconfig instead of silently sending on the wrong stream.
    assertNewsletterConfigValid();

    let groupCategory: string | null = null;
    if (post.group) {
      if (typeof post.group === 'object') {
        groupCategory = post.group.category ?? null;
      } else {
        groupCategory = await resolveGroupCategory(payload, post.group.trim());
      }
    }
    const listIds = resolveAudienceListIds(groupCategory);
    const recipients = await resolveRecipients({ listIds });

    if (recipients.length === 0) {
      return {
        kind: 'skipped',
        reason: 'no-recipients',
        state: {
          ...existing,
          attemptId,
          status: 'skipped',
          targetedLists: joinIds(listIds),
          recipientCount: 0,
          lastSyncedAt: nowIso,
          lastError: null,
        },
      };
    }

    // Crash-safe resume: skip recipients already accepted FOR THIS ATTEMPT.
    // Events from other/legacy attempts are ignored, so stale rows can never
    // short-circuit a real send.
    const submittedRecipients = await submittedRecipientsForAttempt(payload, post.id, attemptId);
    const recipientsToSend = recipients.filter(
      (email) => !submittedRecipients.has(email.trim().toLowerCase()),
    );

    const tag = 'post-newsletter';
    const metadata = buildNewsletterMetadata(post, listIds, attemptId);
    const messageStream = getPostmarkBroadcastMessageStream();

    if (recipientsToSend.length === 0) {
      // Verified resume: every recipient already has a live acceptance for this
      // attempt. Safe to report the current submitted/delivered state.
      const sentAt = existing?.sentAt ?? nowIso;
      const state = await computeSendState(payload, post, attemptId, {
        targetedLists: joinIds(listIds),
        recipientCount: recipients.length,
        failedCount: 0,
        sentAt,
        lastSyncedAt: nowIso,
      });
      return { kind: 'sent', state };
    }

    // Durably claim the attempt BEFORE Postmark can accept anything. If the
    // process dies mid-send, the retry loads this attempt id and resumes via
    // submittedRecipientsForAttempt; without it, the retry would mint a fresh
    // attempt id, see zero accepted recipients, and re-send to the entire
    // audience.
    if (existing?.attemptId !== attemptId) {
      await payload.update({
        collection: 'posts',
        id: post.id,
        depth: 0,
        overrideAccess: true,
        data: {
          newsletterSend: {
            ...existing,
            attemptId,
            lastSyncedAt: nowIso,
          },
        },
      });
    }

    const group = await resolveGroupHeroForPost(payload as Payload, {
      slug: post.slug,
      group: getPostGroupSlug(post.group),
    });
    const continuity = await resolveNewsletterContinuity(payload as Payload, {
      id: post.id,
      slug: post.slug,
      group: getPostGroupSlug(post.group),
    });
    const rendered = buildPostNewsletterContent({ ...post, group, continuity });
    const subject = post.newsletterHeading || post.title;
    let result: Awaited<ReturnType<typeof sendPostmarkNewsletterEmail>>;
    try {
      result = await sendEmail({
        to: recipientsToSend,
        subject,
        htmlBody: rendered.htmlBody,
        textBody: rendered.textBody,
        tag,
        metadata,
        trackOpens: getNewsletterTrackOpens(),
        trackLinks: getNewsletterTrackLinks(),
        // Record acceptances as each batch lands so a crash mid-send can
        // resume this attempt without re-sending to already-accepted
        // recipients. The post-send record calls below are idempotent (the
        // event ledger dedups), so fakes that ignore this callback still work.
        onBatchAccepted: (accepted) =>
          recordPostmarkSubmittedMessages(payload, {
            postId: post.id,
            accepted,
            tag,
            messageStream,
            metadata,
          }),
      });
    } catch (err) {
      if (err instanceof PostmarkBatchSendError) {
        await recordPostmarkSubmittedMessages(payload, {
          postId: post.id,
          accepted: err.accepted,
          tag,
          messageStream,
          metadata,
        });
        const state = await computeSendState(payload, post, attemptId, {
          targetedLists: joinIds(listIds),
          recipientCount: recipients.length,
          failedCount: err.failures.length,
          lastSyncedAt: nowIso,
        });
        // Partial acceptance: keep the real counts but mark the attempt failed
        // so the retry loop re-attempts the rejected recipients.
        state.status = 'failed';
        state.lastError = describeError(err);
        return { kind: 'failed', state, error: err };
      }
      throw err;
    }

    await recordPostmarkSubmittedMessages(payload, {
      postId: post.id,
      accepted: result.accepted,
      tag,
      messageStream,
      metadata,
    });
    const sentAt = now().toISOString();
    const state = await computeSendState(payload, post, attemptId, {
      targetedLists: joinIds(listIds),
      recipientCount: recipients.length,
      failedCount: 0,
      sentAt,
      lastSyncedAt: sentAt,
    });

    return { kind: 'sent', state };
  } catch (err) {
    return {
      kind: 'failed',
      state: {
        ...existing,
        attemptId,
        status: 'failed',
        lastSyncedAt: nowIso,
        lastError: describeError(err),
      },
      error: err,
    };
  }
}
