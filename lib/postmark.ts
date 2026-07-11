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
  /**
   * Called after each batch with the messages Postmark accepted in it, so
   * callers can durably record acceptances as the send progresses. Without
   * this, a crash mid-send loses every completed batch's acceptance and a
   * resume re-sends to recipients who already got the email.
   */
  onBatchAccepted?: (accepted: PostmarkAcceptedMessage[]) => void | Promise<void>;
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

function failureFromBatchResponse(
  response: PostmarkBatchResponse,
  message: string,
): PostmarkFailedMessage {
  return {
    to: response.To?.trim().toLowerCase() || 'unknown recipient',
    errorCode: response.ErrorCode ?? -1,
    message,
    submittedAt: response.SubmittedAt ?? null,
  };
}

export async function sendPostmarkNewsletterEmail(
  options: SendPostmarkNewsletterOptions,
): Promise<SendPostmarkNewsletterResult> {
  const client = options.client ?? getClient();
  const recipients = [...new Set(options.to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const batchSize = options.batchSize ?? 500;
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    throw new Error('Postmark newsletter batchSize must be a positive integer');
  }
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
    const pendingRecipients = new Set(recipientBatch);
    const batchAccepted: PostmarkAcceptedMessage[] = [];
    for (const response of responses) {
      const to = response.To?.trim().toLowerCase();
      if (!to || !pendingRecipients.has(to)) {
        failures.push(failureFromBatchResponse(
          response,
          to
            ? 'Postmark returned a response for an unexpected recipient'
            : 'Postmark returned a response without a recipient',
        ));
        continue;
      }
      pendingRecipients.delete(to);
      if ((response.ErrorCode ?? 0) === 0) {
        if (response.MessageID) {
          messageIds.push(response.MessageID);
          const acceptedMessage: PostmarkAcceptedMessage = {
            to,
            messageId: response.MessageID,
            submittedAt: response.SubmittedAt ?? null,
            message: response.Message ?? null,
          };
          accepted.push(acceptedMessage);
          batchAccepted.push(acceptedMessage);
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
    for (const to of pendingRecipients) {
      failures.push({
        to,
        errorCode: -1,
        message: 'Postmark did not return a response for this recipient',
        submittedAt: null,
      });
    }
    if (batchAccepted.length > 0 && options.onBatchAccepted) {
      await options.onBatchAccepted(batchAccepted);
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
