import type { Payload } from 'payload';
import { ServerClient } from 'postmark';

import { resolveAudienceListIds } from './activecampaign';
import { buildPostNewsletterContent } from './newsletter';
import { resolveGroupHeroForPost } from './post-newsletter';
import type { Post } from '@/payload-types';

export interface SendPreviewOptions {
  postId: number;
  to: string;
  payload: Payload;
}

export interface SendPreviewResult {
  postTitle: string;
  groupCategory: string | null;
  targetedLists: string[];
  messageId: string;
}

export async function sendPostPreview({
  postId,
  to,
  payload,
}: SendPreviewOptions): Promise<SendPreviewResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error('Missing POSTMARK_SERVER_TOKEN');

  const post = (await payload.findByID({
    collection: 'posts',
    id: postId,
    depth: 1,
    overrideAccess: true,
  })) as Post;

  if (!post) throw new Error(`Post ${postId} not found`);

  const groupSlug = typeof post.group === 'string' ? post.group : '';
  let groupCategory: string | null = null;

  if (groupSlug) {
    const groupLookup = await payload.find({
      collection: 'groups',
      where: { slug: { equals: groupSlug } },
      limit: 1,
      overrideAccess: true,
    });
    groupCategory = (groupLookup.docs[0]?.category as string | undefined) ?? null;
  }

  const group = await resolveGroupHeroForPost(payload, post);
  const { htmlBody, textBody } = buildPostNewsletterContent({ ...post, group });

  const targetedLists = resolveAudienceListIds(groupCategory);
  const audienceLabel = groupCategory === 'fiction' ? 'Fiction' : 'Essays';
  const subject = `[Preview — ${audienceLabel}] ${post.title}`;

  const client = new ServerClient(token);
  const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'austen@thearcades.me';
  const messageStream = process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound';

  const result = await client.sendEmail({
    From: fromEmail,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: messageStream,
  });

  return {
    postTitle: post.title as string,
    groupCategory,
    targetedLists,
    messageId: result.MessageID,
  };
}
