import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';
import {
  ActiveCampaignError,
  resolveActiveCampaignRecipientsForLists,
  resolveAudienceListIds,
} from './activecampaign';
import { buildPostNewsletterContent } from './newsletter';
import { resolveGroupHeroForPost } from './post-newsletter';
import {
  getPostmarkBroadcastMessageStream,
  LinkTrackingOptions,
  PostmarkBatchSendError,
  type PostmarkTrackLinks,
  sendPostmarkNewsletterEmail,
} from './postmark';
import {
  recordPostmarkSubmittedMessages,
  submittedRecipientsForPost,
  summarizePostmarkEvents,
} from './postmark-events';

export type NewsletterSendStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NewsletterSendState {
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

function buildNewsletterMetadata(post: Pick<Post, 'id' | 'slug'>, listIds: string[]): Record<string, string> {
  return {
    postId: String(post.id),
    postSlug: post.slug,
    audienceListIds: joinIds(listIds),
  };
}

async function buildStateFromPostmarkEvents(
  payload: NewsletterDeliveryPayload,
  post: Pick<Post, 'id'>,
  base: NewsletterSendState,
): Promise<NewsletterSendState> {
  const summary = await summarizePostmarkEvents(payload, post.id);
  return {
    ...base,
    messageId: joinIds(summary.messageIds),
    acceptedCount: summary.acceptedCount,
    deliveredCount: summary.deliveredCount,
    bouncedCount: summary.bouncedCount,
    openedCount: summary.openedCount,
    clickedCount: summary.clickedCount,
    complainedCount: summary.complainedCount,
    lastEventAt: summary.lastEventAt,
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
        status: 'skipped',
        lastSyncedAt: nowIso,
        lastError: null,
      },
    };
  }

  if (existing?.status === 'sent') {
    return {
      kind: 'skipped',
      reason: 'already-sent',
      state: existing,
    };
  }

  try {
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
    const submittedRecipients = await submittedRecipientsForPost(payload, post.id);
    const recipientsToSend = recipients.filter(
      (email) => !submittedRecipients.has(email.trim().toLowerCase()),
    );

    if (recipients.length === 0) {
      return {
        kind: 'skipped',
        reason: 'no-recipients',
        state: {
          ...existing,
          status: 'skipped',
          targetedLists: joinIds(listIds),
          recipientCount: 0,
          lastSyncedAt: nowIso,
          lastError: null,
        },
      };
    }

    const tag = 'post-newsletter';
    const metadata = buildNewsletterMetadata(post, listIds);
    const messageStream = getPostmarkBroadcastMessageStream();

    if (recipientsToSend.length === 0) {
      const sentAt = existing?.sentAt ?? nowIso;
      const state = await buildStateFromPostmarkEvents(payload, post, {
        status: 'sent',
        targetedLists: joinIds(listIds),
        recipientCount: recipients.length,
        failedCount: 0,
        sentAt,
        lastSyncedAt: nowIso,
        lastError: null,
      });
      return { kind: 'sent', state };
    }

    const group = await resolveGroupHeroForPost(payload as Payload, {
      slug: post.slug,
      group: getPostGroupSlug(post.group),
    });
    const rendered = buildPostNewsletterContent({ ...post, group });
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
        const state = await buildStateFromPostmarkEvents(payload, post, {
          ...existing,
          status: 'failed',
          targetedLists: joinIds(listIds),
          recipientCount: recipients.length,
          failedCount: err.failures.length,
          lastSyncedAt: nowIso,
          lastError: describeError(err),
        });
        return {
          kind: 'failed',
          state,
          error: err,
        };
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
    const state = await buildStateFromPostmarkEvents(payload, post, {
      status: 'sent',
      targetedLists: joinIds(listIds),
      recipientCount: recipients.length,
      failedCount: 0,
      sentAt,
      lastSyncedAt: sentAt,
      lastError: null,
    });

    return {
      kind: 'sent',
      state,
    };
  } catch (err) {
    return {
      kind: 'failed',
      state: {
        ...existing,
        status: 'failed',
        lastSyncedAt: nowIso,
        lastError: describeError(err),
      },
      error: err,
    };
  }
}
