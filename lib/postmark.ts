/**
 * Postmark email client: batch newsletter helper and transactional test sends.
 * Blog publish notifications use ActiveCampaign (`lib/activecampaign.ts`).
 */

import { ServerClient, Message } from 'postmark';
import type { Payload } from 'payload';

const BATCH_SIZE = 500; // Postmark batch API limit

export type PostmarkSendEmailResponse = Awaited<ReturnType<ServerClient['sendEmail']>>;

function getClient(): ServerClient {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error('Missing POSTMARK_SERVER_TOKEN environment variable');
  return new ServerClient(token);
}

function getFromEmail(): string {
  return process.env.POSTMARK_FROM_EMAIL || 'austen@thearcades.me';
}

function getMessageStream(): string {
  return process.env.POSTMARK_BROADCAST_STREAM || 'broadcast';
}

function getTransactionalMessageStream(): string {
  return process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound';
}

export interface NewsletterOptions {
  subject: string;
  htmlBody: string;
  textBody?: string;
  payload: Payload;
}

export interface PostmarkTestEmailOptions {
  to: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  client?: Pick<ServerClient, 'sendEmail'>;
}

export async function sendPostmarkTestEmail(
  options: PostmarkTestEmailOptions,
): Promise<PostmarkSendEmailResponse> {
  const { to, client = getClient() } = options;
  const sentAt = new Date().toISOString();
  const fromEmail = getFromEmail();
  const messageStream = getTransactionalMessageStream();
  const subject = options.subject || `Postmark test email ${sentAt}`;
  const htmlBody =
    options.htmlBody ||
    `<p>This is a Postmark test email from The Arcades.</p><p>Sent at ${sentAt}.</p>`;
  const textBody =
    options.textBody || `This is a Postmark test email from The Arcades.\nSent at ${sentAt}.`;

  return client.sendEmail({
    From: fromEmail,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: messageStream,
  });
}

/**
 * Send a newsletter to all active subscribers via Postmark's batch API.
 * Queries Payload for subscribers, adds personalized unsubscribe links,
 * and sends in batches of 500.
 */
export async function sendNewsletter(options: NewsletterOptions): Promise<number> {
  const { subject, htmlBody, payload, textBody } = options;
  const client = getClient();
  const fromEmail = getFromEmail();
  const messageStream = getMessageStream();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thearcades.me';

  // Fetch all active subscribers
  const result = await payload.find({
    collection: 'subscribers',
    where: {
      unsubscribed: { not_equals: true },
    },
    limit: 0, // return all
  });

  const subscribers = result.docs;
  if (subscribers.length === 0) {
    console.log('[newsletter] No active subscribers, skipping send');
    return 0;
  }

  let totalSent = 0;

  // Send in batches of 500
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const messages: Message[] = batch.map((sub) => {
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribeToken}`;
      const personalizedHtml = `${htmlBody}
        <hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5;" />
        <p style="font-size:12px;color:#999;text-align:center;">
          <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
        </p>`;
      const personalizedText = [
        textBody || htmlBody.replace(/<[^>]+>/g, ''),
        '',
        `Unsubscribe: ${unsubscribeUrl}`,
      ].join('\n');

      return {
        From: fromEmail,
        To: sub.email as string,
        Subject: subject,
        HtmlBody: personalizedHtml,
        TextBody: personalizedText,
        MessageStream: messageStream,
        Headers: [
          {
            Name: 'List-Unsubscribe',
            Value: `<${unsubscribeUrl}>`,
          },
          {
            Name: 'List-Unsubscribe-Post',
            Value: 'List-Unsubscribe=One-Click',
          },
        ],
      };
    });

    await client.sendEmailBatch(messages);
    totalSent += batch.length;
  }

  console.log(`[newsletter] Sent to ${totalSent} subscribers via Postmark`);
  return totalSent;
}
