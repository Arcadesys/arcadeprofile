import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  reconcileNewsletters,
  type ReconcileMessageStatus,
} from './newsletter-reconcile';

type UpdateArgs = { collection: string; id: number; data: Record<string, unknown> };

function makePayload(posts: Record<string, unknown>[]) {
  const updates: UpdateArgs[] = [];
  const payload = {
    async find() {
      return { docs: posts, totalDocs: posts.length };
    },
    async update(args: UpdateArgs) {
      updates.push(args);
      return { id: args.id };
    },
    async create() {
      return {};
    },
    async findByID() {
      return {};
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { payload, updates };
}

const NOW = () => new Date('2026-06-24T12:00:00.000Z');

function submittedPost(id: number, slug: string, messageId: string) {
  return {
    id,
    slug,
    newsletterSend: {
      status: 'submitted',
      attemptId: `attempt-${id}`,
      messageId,
      // well past the 30-min grace window
      sentAt: '2026-06-24T10:00:00.000Z',
    },
  };
}

test('reconcile confirms delivery and counts the post as delivered', async () => {
  const { payload, updates } = makePayload([submittedPost(1, 'a', 'pm-1')]);
  const handled: unknown[] = [];

  const result = await reconcileNewsletters(payload, {
    now: NOW,
    async fetchMessageStatus(): Promise<ReconcileMessageStatus> {
      return { kind: 'delivered', occurredAt: '2026-06-24T10:05:00.000Z', recipient: 'r@example.com' };
    },
    async handleEvent(_payload, input) {
      handled.push(input);
      return { eventType: 'delivery', messageId: 'pm-1', postId: 1 };
    },
  });

  assert.equal(result.checked, 1);
  assert.equal(result.delivered, 1);
  assert.equal(result.undelivered, 0);
  // A synthetic Delivery webhook was fed through the normal event path.
  assert.equal(handled.length, 1);
  // Confirmed-delivered posts are advanced by the event path, not a direct update.
  assert.equal(updates.length, 0);
});

test('reconcile flags a post undelivered when Postmark has no record (phantom send)', async () => {
  const { payload, updates } = makePayload([submittedPost(2, 'phantom', 'pm-missing')]);

  const result = await reconcileNewsletters(payload, {
    now: NOW,
    async fetchMessageStatus(): Promise<ReconcileMessageStatus> {
      return { kind: 'not-found' };
    },
    async handleEvent() {
      throw new Error('should not record events for a phantom send');
    },
  });

  assert.equal(result.checked, 1);
  assert.equal(result.delivered, 0);
  assert.equal(result.undelivered, 1);
  assert.deepEqual(result.undeliveredPosts, [{ id: 2, slug: 'phantom', attemptId: 'attempt-2' }]);
  assert.equal(updates.length, 1);
  const send = updates[0].data.newsletterSend as Record<string, unknown>;
  assert.equal(send.status, 'undelivered');
  assert.equal(send.undeliveredAt, NOW().toISOString());
  assert.match(String(send.lastError), /no record/i);
});

test('reconcile does NOT mark a multi-message post delivered until all are terminal', async () => {
  const post = {
    id: 4,
    slug: 'multi',
    newsletterSend: {
      status: 'submitted',
      attemptId: 'attempt-4',
      messageId: 'pm-a,pm-b',
      sentAt: '2026-06-24T10:00:00.000Z',
    },
  };
  const { payload, updates } = makePayload([post]);
  const handled: unknown[] = [];

  const result = await reconcileNewsletters(payload, {
    now: NOW,
    async fetchMessageStatus(messageId): Promise<ReconcileMessageStatus> {
      // pm-a delivered, pm-b still queued at Postmark.
      return messageId === 'pm-a' ? { kind: 'delivered' } : { kind: 'queued' };
    },
    async handleEvent(_payload, input) {
      handled.push(input);
      return { eventType: 'delivery', messageId: 'pm-a', postId: 4 };
    },
  });

  // The delivered one is recorded, but the post is NOT counted/flagged yet.
  assert.equal(handled.length, 1);
  assert.equal(result.delivered, 0);
  assert.equal(result.undelivered, 0);
  assert.equal(updates.length, 0);
});

test('reconcile leaves still-queued messages as submitted', async () => {
  const { payload, updates } = makePayload([submittedPost(3, 'queued', 'pm-queued')]);

  const result = await reconcileNewsletters(payload, {
    now: NOW,
    async fetchMessageStatus(): Promise<ReconcileMessageStatus> {
      return { kind: 'queued' };
    },
    async handleEvent() {
      throw new Error('should not record events while queued');
    },
  });

  assert.equal(result.checked, 1);
  assert.equal(result.delivered, 0);
  assert.equal(result.undelivered, 0);
  assert.equal(updates.length, 0);
});

test('defaultFetchMessageStatus treats Postmark 422/ErrorCode 701 as not-found', async (t) => {
  process.env.POSTMARK_SERVER_TOKEN = 'test-token';
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const respond = (status: number, body: unknown) => async () =>
    new Response(JSON.stringify(body), { status });

  const { defaultFetchMessageStatus } = await import('./newsletter-reconcile');

  // Postmark reports unknown message ids as 422 + ErrorCode 701, not 404.
  globalThis.fetch = respond(422, { ErrorCode: 701, Message: 'This message was not found.' });
  assert.deepEqual(await defaultFetchMessageStatus('pm-unknown'), { kind: 'not-found' });

  // Other 422s stay transient so a real API hiccup is re-checked next run.
  globalThis.fetch = respond(422, { ErrorCode: 300, Message: 'Invalid request.' });
  assert.deepEqual(await defaultFetchMessageStatus('pm-invalid'), { kind: 'queued' });

  globalThis.fetch = respond(404, {});
  assert.deepEqual(await defaultFetchMessageStatus('pm-404'), { kind: 'not-found' });
});
