import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Post } from '@/payload-types';
import {
  handlePostmarkWebhook,
  normalizePostmarkWebhook,
  type PostmarkEventsPayload,
} from './postmark-events';

type EventDoc = {
  id: number;
  post?: number;
  messageId: string;
  eventType: string;
  recipientEmail?: string;
  occurredAt?: string;
};

function whereEquals(where: unknown, field: string): unknown {
  if (!where || typeof where !== 'object') return undefined;
  const record = where as Record<string, unknown>;
  const direct = record[field];
  if (direct && typeof direct === 'object' && 'equals' in direct) {
    return (direct as { equals?: unknown }).equals;
  }
  const and = record.and;
  if (Array.isArray(and)) {
    for (const clause of and) {
      const found = whereEquals(clause, field);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'A New Post',
    slug: 'new-post',
    excerpt: 'A short summary.',
    content: {
      root: {
        type: 'root',
        children: [],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    } as Post['content'],
    publishedDate: '2026-06-06T12:00:00.000Z',
    publish_status: 'sent',
    updatedAt: '2026-06-06T12:00:00.000Z',
    createdAt: '2026-06-06T12:00:00.000Z',
    ...overrides,
  };
}

function makePayload(post: Post, events: EventDoc[]): PostmarkEventsPayload {
  return {
    async find(args: { collection: string; where?: unknown }) {
      assert.equal(args.collection, 'postmark-events');
      const postId = whereEquals(args.where, 'post');
      const messageId = whereEquals(args.where, 'messageId');
      const eventType = whereEquals(args.where, 'eventType');
      const recipientEmail = whereEquals(args.where, 'recipientEmail');
      const docs = events.filter((event) => {
        if (typeof postId === 'number' && event.post !== postId) return false;
        if (typeof messageId === 'string' && event.messageId !== messageId) return false;
        if (typeof eventType === 'string' && event.eventType !== eventType) return false;
        if (typeof recipientEmail === 'string' && event.recipientEmail !== recipientEmail) {
          return false;
        }
        return true;
      });
      return { docs, totalDocs: docs.length };
    },
    async create(args: { collection: string; data: Omit<EventDoc, 'id'> }) {
      assert.equal(args.collection, 'postmark-events');
      const doc = { id: events.length + 1, ...args.data };
      events.push(doc);
      return doc;
    },
    async findByID(args: { collection: string; id: number }) {
      assert.equal(args.collection, 'posts');
      assert.equal(args.id, post.id);
      return post;
    },
    async update(args: { collection: string; id: number; data: Partial<Post> }) {
      assert.equal(args.collection, 'posts');
      assert.equal(args.id, post.id);
      Object.assign(post, args.data);
      return post;
    },
  } as unknown as PostmarkEventsPayload;
}

test('normalizePostmarkWebhook maps delivery payload metadata', () => {
  const event = normalizePostmarkWebhook({
    MessageID: 'pm-1',
    Recipient: 'Reader@Example.com',
    DeliveredAt: '2026-06-06T13:01:00.000Z',
    Details: '250 OK',
    Tag: 'post-newsletter',
    MessageStream: 'broadcast',
    RecordType: 'Delivery',
    Metadata: {
      postId: '1',
      postSlug: 'new-post',
    },
  });

  assert.deepEqual(event, {
    eventType: 'delivery',
    messageId: 'pm-1',
    recipientEmail: 'reader@example.com',
    tag: 'post-newsletter',
    messageStream: 'broadcast',
    occurredAt: '2026-06-06T13:01:00.000Z',
    details: '250 OK',
    metadata: {
      postId: '1',
      postSlug: 'new-post',
    },
    raw: {
      MessageID: 'pm-1',
      Recipient: 'Reader@Example.com',
      DeliveredAt: '2026-06-06T13:01:00.000Z',
      Details: '250 OK',
      Tag: 'post-newsletter',
      MessageStream: 'broadcast',
      RecordType: 'Delivery',
      Metadata: {
        postId: '1',
        postSlug: 'new-post',
      },
    },
    postId: 1,
  });
});

test('handlePostmarkWebhook records event and refreshes post newsletter summary', async () => {
  const post = makePost({
    newsletterSend: {
      status: 'sent',
      recipientCount: 1,
      sentAt: '2026-06-06T13:00:00.000Z',
      lastSyncedAt: '2026-06-06T13:00:00.000Z',
    },
  });
  const events: EventDoc[] = [
    {
      id: 1,
      post: 1,
      messageId: 'pm-1',
      eventType: 'submitted',
      recipientEmail: 'reader@example.com',
      occurredAt: '2026-06-06T13:00:00.000Z',
    },
  ];

  const result = await handlePostmarkWebhook(makePayload(post, events), {
    MessageID: 'pm-1',
    Recipient: 'reader@example.com',
    DeliveredAt: '2026-06-06T13:01:00.000Z',
    Details: '250 OK',
    RecordType: 'Delivery',
    Metadata: { postId: '1' },
  });

  assert.deepEqual(result, {
    eventType: 'delivery',
    messageId: 'pm-1',
    postId: 1,
  });
  assert.equal(events.length, 2);
  assert.equal(events[1].eventType, 'delivery');
  assert.equal(post.newsletterSend?.messageId, 'pm-1');
  assert.equal(post.newsletterSend?.acceptedCount, 1);
  assert.equal(post.newsletterSend?.deliveredCount, 1);
  assert.equal(post.newsletterSend?.bouncedCount, 0);
  assert.equal(post.newsletterSend?.lastEventAt, '2026-06-06T13:01:00.000Z');
});
