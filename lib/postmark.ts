/**
 * Postmark sends. Subscriber state lives in ActiveCampaign; Postmark is the
 * delivery rail for transactional tests and per-post newsletter broadcasts.
 */

import { ServerClient } from 'postmark';

export type PostmarkSendEmailResponse = Awaited<ReturnType<ServerClient['sendEmail']>>;

type PostmarkBatchMessage = {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
  MessageStream: string;
};

type PostmarkBatchResponse = {
  To?: string;
  SubmittedAt?: string;
  MessageID?: string;
  ErrorCode?: number;
  Message?: string;
};

type PostmarkBatchClient = Pick<ServerClient, 'sendEmailBatch'>;

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

function getBroadcastMessageStream(): string {
  return process.env.POSTMARK_BROADCAST_STREAM || process.env.POSTMARK_NEWSLETTER_STREAM || 'outbound';
}

function getFromName(): string {
  return process.env.POSTMARK_FROM_NAME || 'The Arcades';
}

function formatFromAddress(): string {
  const email = getFromEmail();
  const name = getFromName().trim();
  return name ? `${name} <${email}>` : email;
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

export interface SendPostmarkNewsletterOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  client?: PostmarkBatchClient;
  batchSize?: number;
}

export interface SendPostmarkNewsletterResult {
  messageIds: string[];
  recipientCount: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function sendPostmarkNewsletterEmail(
  options: SendPostmarkNewsletterOptions,
): Promise<SendPostmarkNewsletterResult> {
  const client = options.client ?? getClient();
  const recipients = [...new Set(options.to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const batchSize = options.batchSize ?? 500;
  const from = formatFromAddress();
  const messageStream = getBroadcastMessageStream();
  const messageIds: string[] = [];

  for (const recipientBatch of chunk(recipients, batchSize)) {
    const messages: PostmarkBatchMessage[] = recipientBatch.map((to) => ({
      From: from,
      To: to,
      Subject: options.subject,
      HtmlBody: options.htmlBody,
      TextBody: options.textBody,
      MessageStream: messageStream,
    }));
    const responses = (await client.sendEmailBatch(messages)) as PostmarkBatchResponse[];
    const failed = responses.find((response) => (response.ErrorCode ?? 0) !== 0);
    if (failed) {
      throw new Error(
        `Postmark batch send failed for ${failed.To ?? 'unknown recipient'}: ${failed.Message ?? `ErrorCode ${failed.ErrorCode}`}`,
      );
    }
    for (const response of responses) {
      if (response.MessageID) messageIds.push(response.MessageID);
    }
  }

  return {
    messageIds,
    recipientCount: recipients.length,
  };
}
