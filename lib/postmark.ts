/**
 * Postmark sends. Subscriber state lives in ActiveCampaign; Postmark is the
 * delivery rail for transactional tests and per-post newsletter broadcasts.
 */

import { ServerClient, type Models } from 'postmark';

import {
  formatFromAddress,
  getPostmarkBroadcastMessageStream,
  getPostmarkServerToken,
  getPostmarkTransactionalMessageStream,
} from './postmark-config';

// Re-exported for back-compat with existing importers (e.g. the delivery
// orchestrator). Canonical definitions live in ./postmark-config.
export { getPostmarkBroadcastMessageStream, getPostmarkTransactionalMessageStream };

export const LinkTrackingOptions = {
  TextOnly: 'TextOnly' as Models.LinkTrackingOptions,
  HtmlOnly: 'HtmlOnly' as Models.LinkTrackingOptions,
  HtmlAndText: 'HtmlAndText' as Models.LinkTrackingOptions,
  None: 'None' as Models.LinkTrackingOptions,
} as const;

export type PostmarkSendEmailResponse = Awaited<ReturnType<ServerClient['sendEmail']>>;

type PostmarkBatchMessage = {
  From: string;
  To: string;
  Subject: string;
  Tag?: string;
  HtmlBody: string;
  TextBody: string;
  TrackOpens?: boolean;
  TrackLinks?: PostmarkTrackLinks;
  Metadata?: Record<string, string>;
  MessageStream: string;
};

type PostmarkBatchResponse = {
  To?: string;
  SubmittedAt?: string;
  MessageID?: string;
  ErrorCode?: number;
  Message?: string;
};

type PostmarkSingleClient = Pick<ServerClient, 'sendEmail'>;
type PostmarkBatchClient = Pick<ServerClient, 'sendEmailBatch'>;

export type PostmarkTrackLinks = Models.LinkTrackingOptions;

export type PostmarkAcceptedMessage = {
  to: string;
  messageId: string;
  submittedAt?: string | null;
  message?: string | null;
};

export type PostmarkFailedMessage = {
  to: string;
  errorCode: number;
  message: string;
  submittedAt?: string | null;
};

export class PostmarkBatchSendError extends Error {
  constructor(
    message: string,
    public readonly accepted: PostmarkAcceptedMessage[],
    public readonly failures: PostmarkFailedMessage[],
    public readonly recipientCount: number,
  ) {
    super(message);
    this.name = 'PostmarkBatchSendError';
  }
}

function getClient(): ServerClient {
  const token = getPostmarkServerToken();
  if (!token) throw new Error('Missing POSTMARK_SERVER_TOKEN environment variable');
  return new ServerClient(token);
}

export interface PostmarkTestEmailOptions {
  to: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  client?: PostmarkSingleClient;
}

export interface SendPostmarkTransactionalEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  client?: PostmarkSingleClient;
  messageStream?: string;
}

export async function sendPostmarkTransactionalEmail(
  options: SendPostmarkTransactionalEmailOptions,
): Promise<PostmarkSendEmailResponse> {
  const client = options.client ?? getClient();
  return client.sendEmail({
    From: formatFromAddress(),
    To: options.to,
    Subject: options.subject,
    HtmlBody: options.htmlBody,
    TextBody: options.textBody,
    MessageStream: options.messageStream ?? getPostmarkTransactionalMessageStream(),
  });
}

export async function sendPostmarkTestEmail(
  options: PostmarkTestEmailOptions,
): Promise<PostmarkSendEmailResponse> {
  const { to, client } = options;
  const sentAt = new Date().toISOString();
  const subject = options.subject || `Postmark test email ${sentAt}`;
  const htmlBody =
    options.htmlBody ||
    `<p>This is a Postmark test email from The Arcades.</p><p>Sent at ${sentAt}.</p>`;
  const textBody =
    options.textBody || `This is a Postmark test email from The Arcades.\nSent at ${sentAt}.`;

  return sendPostmarkTransactionalEmail({
    to,
    subject,
    htmlBody,
    textBody,
    client,
  });
}

export interface SendPostmarkNewsletterOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  tag?: string;
  metadata?: Record<string, string>;
  trackOpens?: boolean;
  trackLinks?: PostmarkTrackLinks;
  client?: PostmarkBatchClient;
  batchSize?: number;
}

export interface SendPostmarkNewsletterResult {
  messageIds: string[];
  recipientCount: number;
  accepted: PostmarkAcceptedMessage[];
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
  const messageStream = getPostmarkBroadcastMessageStream();
  const messageIds: string[] = [];
  const accepted: PostmarkAcceptedMessage[] = [];
  const failures: PostmarkFailedMessage[] = [];

  for (const recipientBatch of chunk(recipients, batchSize)) {
    const messages: PostmarkBatchMessage[] = recipientBatch.map((to) => ({
      From: from,
      To: to,
      Subject: options.subject,
      ...(options.tag ? { Tag: options.tag } : {}),
      HtmlBody: options.htmlBody,
      TextBody: options.textBody,
      ...(options.trackOpens !== undefined ? { TrackOpens: options.trackOpens } : {}),
      ...(options.trackLinks ? { TrackLinks: options.trackLinks } : {}),
      ...(options.metadata ? { Metadata: options.metadata } : {}),
      MessageStream: messageStream,
    }));
    const responses = (await client.sendEmailBatch(messages)) as PostmarkBatchResponse[];
    for (const response of responses) {
      const to = response.To?.trim().toLowerCase() || 'unknown recipient';
      if ((response.ErrorCode ?? 0) === 0) {
        if (response.MessageID) {
          messageIds.push(response.MessageID);
          accepted.push({
            to,
            messageId: response.MessageID,
            submittedAt: response.SubmittedAt ?? null,
            message: response.Message ?? null,
          });
        } else {
          failures.push({
            to,
            errorCode: 0,
            message: 'Postmark accepted the message but did not return a MessageID',
            submittedAt: response.SubmittedAt ?? null,
          });
        }
      } else {
        failures.push({
          to,
          errorCode: response.ErrorCode ?? -1,
          message: response.Message ?? `ErrorCode ${response.ErrorCode}`,
          submittedAt: response.SubmittedAt ?? null,
        });
      }
    }
  }

  if (failures.length > 0) {
    const summary = failures
      .slice(0, 3)
      .map((failure) => `${failure.to}: ${failure.message}`)
      .join('; ');
    throw new PostmarkBatchSendError(
      `Postmark rejected ${failures.length} of ${recipients.length} newsletter recipient(s): ${summary}`,
      accepted,
      failures,
      recipients.length,
    );
  }

  return {
    messageIds,
    recipientCount: recipients.length,
    accepted,
  };
}
