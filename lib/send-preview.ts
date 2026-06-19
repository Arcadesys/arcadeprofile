import type { Payload } from 'payload';

import { ActiveCampaignError, resolveAudienceListIds } from './activecampaign';
import { buildPostNewsletterContent } from './newsletter';
import { resolveGroupHeroForPost } from './post-newsletter';
import { sendPostmarkTransactionalEmail } from './postmark';
import type { Post } from '@/payload-types';

type PreviewDeps = {
  resolveTargetedLists?: typeof resolveAudienceListIds;
  sendEmail?: typeof sendPostmarkTransactionalEmail;
};

export interface SendPreviewOptions {
  postId: number;
  to: string;
  payload: Payload;
  deps?: PreviewDeps;
}

export interface SendPreviewResult {
  postTitle: string;
  groupCategory: string | null;
  targetedLists: string[];
  messageId: string;
}

function resolvePreviewTargetedLists(
  groupCategory: string | null,
  resolveTargetedLists: typeof resolveAudienceListIds,
): string[] {
  try {
    return resolveTargetedLists(groupCategory);
  } catch (err) {
    if (err instanceof ActiveCampaignError && /^Missing AC_LIST_ID_/.test(err.message)) {
      return [];
    }
    throw err;
  }
}

export async function sendPostPreview({
  postId,
  to,
  payload,
  deps = {},
}: SendPreviewOptions): Promise<SendPreviewResult> {
  const resolveTargetedLists = deps.resolveTargetedLists ?? resolveAudienceListIds;
  const sendEmail = deps.sendEmail ?? sendPostmarkTransactionalEmail;

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

  const targetedLists = resolvePreviewTargetedLists(groupCategory, resolveTargetedLists);
  const audienceLabel = groupCategory === 'fiction' ? 'Fiction' : 'Essays';
  const subject = `[Preview — ${audienceLabel}] ${post.title}`;

  const result = await sendEmail({
    to,
    subject,
    htmlBody,
    textBody,
  });

  return {
    postTitle: post.title as string,
    groupCategory,
    targetedLists,
    messageId: result.MessageID,
  };
}
