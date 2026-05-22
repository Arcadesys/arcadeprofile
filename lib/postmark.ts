/**
 * Postmark transactional test sends. Blog publish notifications use
 * ActiveCampaign (`lib/activecampaign.ts`); subscriber state lives in AC,
 * not in Payload, so the previous batch newsletter helper was removed.
 */

import { ServerClient } from 'postmark';

export type PostmarkSendEmailResponse = Awaited<ReturnType<ServerClient['sendEmail']>>;

function getClient(): ServerClient {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error('Missing POSTMARK_SERVER_TOKEN environment variable');
  return new ServerClient(token);
}

function getFromEmail(): string {
  return process.env.POSTMARK_FROM_EMAIL || 'austen@thearcades.me';
}

function getTransactionalMessageStream(): string {
  return process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound';
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
    `<p>This is a Postmark test email from Free Play Publishing.</p><p>Sent at ${sentAt}.</p>`;
  const textBody =
    options.textBody || `This is a Postmark test email from Free Play Publishing.\nSent at ${sentAt}.`;

  return client.sendEmail({
    From: fromEmail,
    To: to,
    Subject: subject,
    HtmlBody: htmlBody,
    TextBody: textBody,
    MessageStream: messageStream,
  });
}
