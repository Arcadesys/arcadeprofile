import { config } from 'dotenv';
config({ path: '.env.local' });

import { getAudienceListId, resolveActiveCampaignRecipientsForLists } from '../lib/activecampaign';
import { loadMarkdownGroups, loadMarkdownPosts, selectPublicMarkdownPosts } from '../lib/markdown-posts';
import { buildPostNewsletterContent } from '../lib/newsletter';
import {
  assertEssayGroup,
  findPostmarkRecipientsByAttempt,
  prepareAttempt,
  readReceipt,
  receiptPath,
  verifyProductionEssayUrl,
  writeReceipt,
} from '../lib/newsletter-post';
import {
  LinkTrackingOptions,
  sendPostmarkNewsletterEmail,
  sendPostmarkTransactionalEmail,
  type PostmarkTrackLinks,
} from '../lib/postmark';
import {
  getPostmarkServerToken,
  getPostmarkTransactionalMessageStream,
} from '../lib/postmark-config';
import { buildPostUrl } from '../lib/post-url';

type Options = {
  slug: string;
  previewTo?: string;
  send: boolean;
  resend: boolean;
  reason?: string;
};

function parseArgs(argv: string[]): Options {
  let slug = '';
  let previewTo: string | undefined;
  let send = false;
  let resend = false;
  let reason: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--slug') slug = argv[++index] ?? '';
    else if (arg === '--preview-to') previewTo = argv[++index];
    else if (arg === '--reason') reason = argv[++index];
    else if (arg === '--send') send = true;
    else if (arg === '--resend') resend = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!slug) throw new Error('Usage: npm run newsletter:post -- --slug <slug> [--preview-to <email> | --send] [--resend --reason "<reason>"]');
  if (previewTo && send) throw new Error('--preview-to and --send are mutually exclusive.');
  if (resend && !send) throw new Error('--resend requires --send.');
  if (reason && !resend) throw new Error('--reason is only valid with --resend.');
  return { slug, previewTo, send, resend, reason };
}

function trackingOptions(): { trackOpens: boolean; trackLinks: PostmarkTrackLinks } {
  const trackOpens = process.env.POSTMARK_TRACK_OPENS?.trim().toLowerCase() === 'true';
  const raw = process.env.POSTMARK_TRACK_LINKS?.trim() || 'None';
  if (!['None', 'TextOnly', 'HtmlOnly', 'HtmlAndText'].includes(raw)) {
    throw new Error('POSTMARK_TRACK_LINKS must be None, TextOnly, HtmlOnly, or HtmlAndText.');
  }
  return {
    trackOpens,
    trackLinks: LinkTrackingOptions[raw as keyof typeof LinkTrackingOptions],
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const post = selectPublicMarkdownPosts(loadMarkdownPosts()).find((item) => item.slug === options.slug);
  if (!post) throw new Error(`No currently public essay found for slug ${options.slug}.`);
  assertEssayGroup(post.group);
  const group = loadMarkdownGroups().find((item) => item.slug === post.group);
  if (!group) throw new Error(`Missing group manifest for ${post.group}.`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thearcades.me').replace(/\/+$/, '');
  const productionUrl = `${siteUrl}${buildPostUrl(post.group, post.slug)}`;
  const content = buildPostNewsletterContent({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    markdownBody: post.body,
    hero: post.hero,
    group: {
      slug: group.slug,
      title: group.title,
      image: group.project?.image,
    },
  }, siteUrl);

  if (!options.previewTo && !options.send) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      slug: post.slug,
      group: post.group,
      productionUrl,
      targetLists: ['All', 'Essays'],
      subject: post.title,
    }, null, 2));
    return;
  }

  if (options.previewTo) {
    const result = await sendPostmarkTransactionalEmail({
      to: options.previewTo,
      subject: `[Preview] ${post.title}`,
      htmlBody: content.htmlBody,
      textBody: content.textBody,
      messageStream: getPostmarkTransactionalMessageStream(),
      tag: 'essay-newsletter-preview',
      metadata: { newsletter_slug: post.slug, newsletter_mode: 'preview' },
    });
    console.log(`Preview accepted by Postmark. MessageID: ${result.MessageID}`);
    return;
  }

  await verifyProductionEssayUrl(productionUrl);
  const listIds = [getAudienceListId('all'), getAudienceListId('essays')];
  const audience = await resolveActiveCampaignRecipientsForLists({ listIds });
  if (audience.length === 0) throw new Error('ActiveCampaign returned no active All/Essays recipients.');

  const filePath = receiptPath(post.slug);
  const prepared = prepareAttempt({
    receipt: readReceipt(filePath),
    slug: post.slug,
    group: post.group,
    productionUrl,
    audience,
    resend: options.resend,
    reason: options.reason,
  });
  writeReceipt(filePath, prepared.receipt);

  const token = getPostmarkServerToken();
  if (!token) throw new Error('Missing POSTMARK_SERVER_TOKEN environment variable.');
  const prior = await findPostmarkRecipientsByAttempt({
    attemptId: prepared.attempt.id,
    serverToken: token,
  });
  if (prior.messageIds.length < prepared.attempt.acceptedCount) {
    throw new Error('Postmark metadata history is shorter than the receipt; refusing a potentially duplicate resume.');
  }
  const sent = prior.recipients;
  const messageIds = new Set([...prepared.attempt.messageIds, ...prior.messageIds]);
  const remaining = audience.filter((email) => !sent.has(email.toLowerCase()));
  prepared.attempt.messageIds = [...messageIds];
  prepared.attempt.acceptedCount = sent.size;
  writeReceipt(filePath, prepared.receipt);

  const tracking = trackingOptions();
  await sendPostmarkNewsletterEmail({
    to: remaining,
    subject: post.title,
    htmlBody: content.htmlBody,
    textBody: content.textBody,
    tag: 'essay-newsletter',
    metadata: {
      newsletter_slug: post.slug,
      newsletter_attempt: prepared.attempt.id,
    },
    ...tracking,
    onBatchAccepted: (accepted) => {
      for (const message of accepted) {
        sent.add(message.to.toLowerCase());
        messageIds.add(message.messageId);
      }
      prepared.attempt.messageIds = [...messageIds];
      prepared.attempt.acceptedCount = sent.size;
      writeReceipt(filePath, prepared.receipt);
    },
  });

  prepared.attempt.acceptedCount = audience.length;
  prepared.attempt.completedAt = new Date().toISOString();
  writeReceipt(filePath, prepared.receipt);
  console.log(`Broadcast complete: ${audience.length} recipients; receipt ${filePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
