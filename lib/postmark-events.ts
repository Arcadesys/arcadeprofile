import type { Payload, Where } from 'payload';

import type { Post } from '@/payload-types';
import type { PostmarkAcceptedMessage } from './postmark';

export type PostmarkEventType =
  | 'submitted'
  | 'delivery'
  | 'bounce'
  | 'open'
  | 'click'
  | 'spam_complaint'
  | 'subscription_change'
  | 'smtp_api_error'
  | 'other';

export type PostmarkEventsPayload = Pick<Payload, 'create' | 'find' | 'findByID' | 'update'>;

type JsonRecord = Record<string, unknown>;

export type NormalizedPostmarkEvent = {
  eventType: PostmarkEventType;
  messageId: string;
  recipientEmail?: string;
  tag?: string;
  messageStream?: string;
  occurredAt?: string;
  details?: string;
  metadata?: Record<string, string>;
  raw?: JsonRecord;
  postId?: number;
};

type EventDoc = {
  id?: number | string;
  post?: number | { id?: number | string } | null;
  messageId?: string | null;
  eventType?: PostmarkEventType | null;
  recipientEmail?: string | null;
  occurredAt?: string | null;
};

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function stringField(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parsePositiveIntegerId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function numberField(record: JsonRecord, key: string): number | undefined {
  const value = record[key];
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string') return parsePositiveIntegerId(value);
  return undefined;
}

function metadataField(record: JsonRecord): Record<string, string> | undefined {
  const raw = asRecord(record.Metadata);
  if (!raw) return undefined;

  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      metadata[key] = value;
    } else if (value !== null && value !== undefined) {
      metadata[key] = String(value);
    }
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function relationId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string') return parsePositiveIntegerId(value);
  const record = asRecord(value);
  if (record) return numberField(record, 'id');
  return undefined;
}

function normalizeEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function eventTypeForRecordType(recordType: string | undefined): PostmarkEventType {
  switch (recordType) {
    case 'Delivery':
      return 'delivery';
    case 'Bounce':
      return 'bounce';
    case 'Open':
      return 'open';
    case 'Click':
      return 'click';
    case 'SpamComplaint':
      return 'spam_complaint';
    case 'SubscriptionChange':
      return 'subscription_change';
    case 'SMTPAPIError':
    case 'SmtpApiError':
      return 'smtp_api_error';
    default:
      return 'other';
  }
}

function occurredAtForEvent(record: JsonRecord, eventType: PostmarkEventType): string | undefined {
  const candidates: Record<PostmarkEventType, string[]> = {
    submitted: ['SubmittedAt'],
    delivery: ['DeliveredAt'],
    bounce: ['BouncedAt'],
    open: ['ReceivedAt'],
    click: ['ClickedAt', 'ReceivedAt'],
    spam_complaint: ['BouncedAt'],
    subscription_change: ['ChangedAt'],
    smtp_api_error: ['ReceivedAt'],
    other: ['ReceivedAt', 'DeliveredAt', 'BouncedAt', 'ChangedAt', 'ClickedAt', 'SubmittedAt'],
  };

  for (const key of candidates[eventType]) {
    const value = stringField(record, key);
    if (value) return value;
  }
  return undefined;
}

function detailsForEvent(record: JsonRecord): string | undefined {
  return (
    stringField(record, 'Details') ??
    stringField(record, 'Description') ??
    stringField(record, 'Message') ??
    stringField(record, 'Name') ??
    stringField(record, 'Type')
  );
}

// Thrown when an incoming webhook payload is malformed. The route maps this to
// a 400 so Postmark won't retry an unprocessable payload in a loop.
export class PostmarkWebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostmarkWebhookValidationError';
  }
}

export function normalizePostmarkWebhook(input: unknown): NormalizedPostmarkEvent {
  const record = asRecord(input);
  if (!record) throw new PostmarkWebhookValidationError('Postmark webhook payload must be a JSON object.');

  const messageId = stringField(record, 'MessageID');
  if (!messageId) throw new PostmarkWebhookValidationError('Postmark webhook payload is missing MessageID.');

  const recordType = stringField(record, 'RecordType');
  const eventType = eventTypeForRecordType(recordType);
  const metadata = metadataField(record);
  const postId = numberField(record, 'postId') ?? (metadata ? numberField(metadata, 'postId') : undefined);
  const recipientEmail = normalizeEmail(stringField(record, 'Recipient') ?? stringField(record, 'Email'));

  return {
    eventType,
    messageId,
    ...(recipientEmail ? { recipientEmail } : {}),
    ...(stringField(record, 'Tag') ? { tag: stringField(record, 'Tag') } : {}),
    ...(stringField(record, 'MessageStream') ? { messageStream: stringField(record, 'MessageStream') } : {}),
    ...(occurredAtForEvent(record, eventType) ? { occurredAt: occurredAtForEvent(record, eventType) } : {}),
    ...(detailsForEvent(record) ? { details: detailsForEvent(record) } : {}),
    ...(metadata ? { metadata } : {}),
    raw: record,
    ...(postId ? { postId } : {}),
  };
}

async function resolvePostIdFromMessage(
  payload: PostmarkEventsPayload,
  messageId: string,
): Promise<number | undefined> {
  const existing = await payload.find({
    collection: 'postmark-events',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { messageId: { equals: messageId } },
        { post: { exists: true } },
      ],
    },
  });
  return relationId((existing.docs[0] as EventDoc | undefined)?.post);
}

async function hasRecordedEvent(
  payload: PostmarkEventsPayload,
  event: NormalizedPostmarkEvent,
): Promise<boolean> {
  const clauses: Where[] = [
    { messageId: { equals: event.messageId } },
    { eventType: { equals: event.eventType } },
  ];
  if (event.occurredAt) clauses.push({ occurredAt: { equals: event.occurredAt } });
  if (event.recipientEmail) clauses.push({ recipientEmail: { equals: event.recipientEmail } });

  const existing = await payload.find({
    collection: 'postmark-events',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { and: clauses },
  });
  return existing.docs.length > 0;
}

async function createEvent(
  payload: PostmarkEventsPayload,
  event: NormalizedPostmarkEvent,
  postId: number | undefined,
): Promise<void> {
  if (await hasRecordedEvent(payload, event)) return;

  await payload.create({
    collection: 'postmark-events',
    depth: 0,
    overrideAccess: true,
    data: {
      ...(postId ? { post: postId } : {}),
      messageId: event.messageId,
      eventType: event.eventType,
      ...(event.recipientEmail ? { recipientEmail: event.recipientEmail } : {}),
      ...(event.tag ? { tag: event.tag } : {}),
      ...(event.messageStream ? { messageStream: event.messageStream } : {}),
      ...(event.occurredAt ? { occurredAt: event.occurredAt } : {}),
      ...(event.details ? { details: event.details } : {}),
      ...(event.metadata ? { metadata: event.metadata } : {}),
      ...(event.raw ? { raw: event.raw } : {}),
    },
  });
}

function uniqueMessageCount(events: EventDoc[], eventType: PostmarkEventType): number {
  const messageIds = new Set<string>();
  for (const event of events) {
    if (event.eventType !== eventType) continue;
    if (event.messageId) messageIds.add(event.messageId);
  }
  return messageIds.size;
}

function latestEventAt(events: EventDoc[]): string | null {
  let latest = 0;
  for (const event of events) {
    if (!event.occurredAt) continue;
    const time = Date.parse(event.occurredAt);
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  return latest > 0 ? new Date(latest).toISOString() : null;
}

export async function summarizePostmarkEvents(
  payload: PostmarkEventsPayload,
  postId: number,
): Promise<{
  messageIds: string[];
  acceptedCount: number;
  deliveredCount: number;
  bouncedCount: number;
  openedCount: number;
  clickedCount: number;
  complainedCount: number;
  lastEventAt: string | null;
}> {
  const result = await payload.find({
    collection: 'postmark-events',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { post: { equals: postId } },
  });
  const events = result.docs as EventDoc[];
  const messageIds = [...new Set(events
    .filter((event) => event.eventType === 'submitted' && event.messageId)
    .map((event) => event.messageId as string))]
    .sort();

  return {
    messageIds,
    acceptedCount: uniqueMessageCount(events, 'submitted'),
    deliveredCount: uniqueMessageCount(events, 'delivery'),
    bouncedCount: uniqueMessageCount(events, 'bounce'),
    openedCount: uniqueMessageCount(events, 'open'),
    clickedCount: uniqueMessageCount(events, 'click'),
    complainedCount: uniqueMessageCount(events, 'spam_complaint'),
    lastEventAt: latestEventAt(events),
  };
}

export async function refreshPostNewsletterEventSummary(
  payload: PostmarkEventsPayload,
  postId: number,
): Promise<void> {
  const [post, summary] = await Promise.all([
    payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
      overrideAccess: true,
    }) as Promise<Post>,
    summarizePostmarkEvents(payload, postId),
  ]);

  const existing = post.newsletterSend ?? {};
  await payload.update({
    collection: 'posts',
    id: postId,
    depth: 0,
    overrideAccess: true,
    data: {
      newsletterSend: {
        ...existing,
        messageId: summary.messageIds.join(','),
        acceptedCount: summary.acceptedCount,
        deliveredCount: summary.deliveredCount,
        bouncedCount: summary.bouncedCount,
        openedCount: summary.openedCount,
        clickedCount: summary.clickedCount,
        complainedCount: summary.complainedCount,
        lastEventAt: summary.lastEventAt,
        lastSyncedAt: new Date().toISOString(),
      },
    },
  });
}

export async function recordPostmarkSubmittedMessages(
  payload: PostmarkEventsPayload,
  options: {
    postId: number;
    accepted: PostmarkAcceptedMessage[];
    tag?: string;
    messageStream?: string;
    metadata?: Record<string, string>;
  },
): Promise<void> {
  for (const accepted of options.accepted) {
    await createEvent(
      payload,
      {
        eventType: 'submitted',
        messageId: accepted.messageId,
        recipientEmail: normalizeEmail(accepted.to),
        tag: options.tag,
        messageStream: options.messageStream,
        occurredAt: accepted.submittedAt ?? undefined,
        details: accepted.message ?? undefined,
        metadata: options.metadata,
        raw: {
          MessageID: accepted.messageId,
          Recipient: accepted.to,
          SubmittedAt: accepted.submittedAt ?? null,
          Message: accepted.message ?? null,
          Tag: options.tag ?? null,
          MessageStream: options.messageStream ?? null,
          Metadata: options.metadata ?? null,
        },
        postId: options.postId,
      },
      options.postId,
    );
  }
}

export async function submittedRecipientsForPost(
  payload: PostmarkEventsPayload,
  postId: number,
): Promise<Set<string>> {
  const result = await payload.find({
    collection: 'postmark-events',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: {
      and: [
        { post: { equals: postId } },
        { eventType: { equals: 'submitted' } },
      ],
    },
  });
  const recipients = new Set<string>();
  for (const event of result.docs as EventDoc[]) {
    const email = normalizeEmail(event.recipientEmail ?? undefined);
    if (email) recipients.add(email);
  }
  return recipients;
}

export async function handlePostmarkWebhook(
  payload: PostmarkEventsPayload,
  input: unknown,
): Promise<{ eventType: PostmarkEventType; messageId: string; postId?: number }> {
  const event = normalizePostmarkWebhook(input);
  const postId = event.postId ?? await resolvePostIdFromMessage(payload, event.messageId);

  await createEvent(payload, event, postId);
  if (postId) await refreshPostNewsletterEventSummary(payload, postId);

  return {
    eventType: event.eventType,
    messageId: event.messageId,
    ...(postId ? { postId } : {}),
  };
}
