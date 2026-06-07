import type { Payload } from 'payload';

import type { Post } from '@/payload-types';
import {
  ActiveCampaignError,
  resolveActiveCampaignRecipientsForLists,
  resolveAudienceListIds,
} from './activecampaign';
import { buildPostNewsletterContent } from './newsletter';
import { resolveGroupHeroForPost } from './post-newsletter';
import { sendPostmarkNewsletterEmail } from './postmark';

export type NewsletterSendStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NewsletterSendState {
  messageId?: string | null;
  status?: NewsletterSendStatus | null;
  targetedLists?: string | null;
  recipientCount?: number | null;
  sentAt?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export type NewsletterDeliveryOutcome =
  | { kind: 'sent'; state: NewsletterSendState }
  | { kind: 'failed'; state: NewsletterSendState; error: unknown }
  | { kind: 'skipped'; reason: string; state: NewsletterSendState };

export type NewsletterDeliveryPayload = Pick<Payload, 'find' | 'findByID'>;

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
  })) as Post;

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
        groupCategory = (post.group.category as string | undefined) ?? null;
      } else if (typeof post.group === 'string') {
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
          status: 'skipped',
          targetedLists: joinIds(listIds),
          recipientCount: 0,
          lastSyncedAt: nowIso,
          lastError: null,
        },
      };
    }

    const group = await resolveGroupHeroForPost(payload as Payload, post);
    const rendered = buildPostNewsletterContent({ ...post, group });
    const subject = post.newsletterHeading || post.title;
    const result = await sendEmail({
      to: recipients,
      subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
    });
    const sentAt = now().toISOString();

    return {
      kind: 'sent',
      state: {
        status: 'sent',
        messageId: joinIds(result.messageIds),
        targetedLists: joinIds(listIds),
        recipientCount: result.recipientCount,
        sentAt,
        lastSyncedAt: sentAt,
        lastError: null,
      },
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
