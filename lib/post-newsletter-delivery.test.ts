import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import type { Post } from '@/payload-types';
import { deliverPostNewsletter, type NewsletterDeliveryPayload } from './post-newsletter-delivery';
import { PostmarkBatchSendError } from './postmark';

const EMPTY_CONTENT = {
  root: {
    type: 'root',
    children: [],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'A New Post',
    slug: 'new-post',
    excerpt: 'A short summary.',
    content: EMPTY_CONTENT as Post['content'],
    publishedDate: '2026-06-06T12:00:00.000Z',
    group: 'story-group',
    publish_status: 'published',
    updatedAt: '2026-06-06T12:00:00.000Z',
    createdAt: '2026-06-06T12:00:00.000Z',
    ...overrides,
  };
}

type EventDoc = {
  id: number;
  post?: number;
  messageId: string;
  eventType: string;
  recipientEmail?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown> | null;
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

type PostUpdate = { id: number | string; data: Record<string, unknown> };

function makePayload(
  post: Post,
  category = 'fiction',
  events: EventDoc[] = [],
  updates: PostUpdate[] = [],
): NewsletterDeliveryPayload {
  return {
    async find(args: { collection: string; where?: unknown }) {
      if (args.collection === 'groups') {
        return {
          docs: [{ slug: 'story-group', title: 'Story Group', category, image: null }],
        };
      }
      if (args.collection === 'postmark-events') {
        const postId = whereEquals(args.where, 'post');
        const messageId = whereEquals(args.where, 'messageId');
        const eventType = whereEquals(args.where, 'eventType');
        const recipientEmail = whereEquals(args.where, 'recipientEmail');
        const docs = events.filter((event) => {
          if (typeof postId === 'number' && event.post !== postId) return false;
          if (typeof messageId === 'string' && event.messageId !== messageId) return false;
          if (typeof eventType === 'string' && event.eventType !== eventType) return false;
          if (typeof recipientEmail === 'string' && event.recipientEmail !== recipientEmail) return false;
          return true;
        });
        return { docs, totalDocs: docs.length };
      }
      return { docs: [] };
    },
    async findByID() {
      return post;
    },
    async create(args: { collection: string; data: Omit<EventDoc, 'id'> }) {
      assert.equal(args.collection, 'postmark-events');
      const doc = { id: events.length + 1, ...args.data };
      events.push(doc);
      return doc;
    },
    async update(args: { collection: string; id: number | string; data: Record<string, unknown> }) {
      assert.equal(args.collection, 'posts');
      updates.push({ id: args.id, data: args.data });
      return { ...post, ...args.data };
    },
  } as unknown as NewsletterDeliveryPayload;
}

function setAudienceEnv() {
  process.env.AC_LIST_ID_ALL_PERPOST = '7';
  process.env.AC_LIST_ID_FICTION_PERPOST = '9';
  process.env.AC_LIST_ID_ESSAYS_PERPOST = '10';
}

afterEach(() => {
  delete process.env.AC_LIST_ID_ALL_PERPOST;
  delete process.env.AC_LIST_ID_FICTION_PERPOST;
  delete process.env.AC_LIST_ID_ESSAYS_PERPOST;
  delete process.env.POSTMARK_REQUIRED_IN_PROD;
});

const FIXED_ATTEMPT = () => 'attempt-test';

test('deliverPostNewsletter resolves AC recipients and sends with rendered post content', async () => {
  setAudienceEnv();
  const sent: Array<{ to: string[]; subject: string }> = [];
  const now = new Date('2026-06-06T13:00:00.000Z');
  const events: EventDoc[] = [];

  const outcome = await deliverPostNewsletter(makePayload(makePost(), 'fiction', events), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients({ listIds }) {
      assert.deepEqual(listIds, ['7', '9']);
      return ['reader@example.com'];
    },
    async sendEmail(options) {
      sent.push({ to: options.to, subject: options.subject });
      assert.equal(options.tag, 'post-newsletter');
      assert.deepEqual(options.metadata, {
        postId: '1',
        postSlug: 'new-post',
        audienceListIds: '7,9',
        attemptId: 'attempt-test',
      });
      assert.match(options.htmlBody, /A New Post/);
      assert.match(options.textBody, /A short summary/);
      return {
        messageIds: ['pm-1'],
        recipientCount: options.to.length,
        accepted: [
          { to: options.to[0], messageId: 'pm-1', submittedAt: now.toISOString(), message: 'OK' },
        ],
      };
    },
  });

  assert.equal(outcome.kind, 'sent');
  assert.deepEqual(sent, [{ to: ['reader@example.com'], subject: 'A New Post' }]);
  if (outcome.kind === 'sent') {
    // One accepted, zero delivered → status is `submitted`, not `delivered`.
    assert.deepEqual(outcome.state, {
      attemptId: 'attempt-test',
      status: 'submitted',
      messageId: 'pm-1',
      targetedLists: '7,9',
      recipientCount: 1,
      acceptedCount: 1,
      failedCount: 0,
      deliveredCount: 0,
      bouncedCount: 0,
      openedCount: 0,
      clickedCount: 0,
      complainedCount: 0,
      sentAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
      lastEventAt: now.toISOString(),
      undeliveredAt: null,
      lastError: null,
    });
  }
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'submitted');
  assert.equal(events[0].recipientEmail, 'reader@example.com');
});

test('deliverPostNewsletter skips suppressed posts', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const outcome = await deliverPostNewsletter(
    makePayload(makePost({ suppressNewsletter: true })),
    1,
    {
      now: () => now,
      async resolveRecipients() {
        throw new Error('should not resolve recipients');
      },
      async sendEmail() {
        throw new Error('should not send');
      },
    },
  );

  assert.equal(outcome.kind, 'skipped');
  if (outcome.kind === 'skipped') {
    assert.equal(outcome.reason, 'suppressNewsletter');
    assert.equal(outcome.state.status, 'suppressed');
    assert.equal(outcome.state.lastSyncedAt, now.toISOString());
  }
});

test('deliverPostNewsletter records failed send state', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const outcome = await deliverPostNewsletter(makePayload(makePost()), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients() {
      return ['reader@example.com'];
    },
    async sendEmail() {
      throw new Error('Postmark down');
    },
  });

  assert.equal(outcome.kind, 'failed');
  if (outcome.kind === 'failed') {
    assert.equal(outcome.state.status, 'failed');
    assert.equal(outcome.state.lastSyncedAt, now.toISOString());
    assert.equal(outcome.state.lastError, 'Postmark down');
  }
});

test('deliverPostNewsletter fails loudly on missing config instead of sending', async () => {
  // No audience env set; require config in this run.
  process.env.POSTMARK_REQUIRED_IN_PROD = 'true';
  const now = new Date('2026-06-06T13:00:00.000Z');
  const outcome = await deliverPostNewsletter(makePayload(makePost()), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients() {
      throw new Error('should not resolve recipients when config is invalid');
    },
    async sendEmail() {
      throw new Error('should not send when config is invalid');
    },
  });

  assert.equal(outcome.kind, 'failed');
  if (outcome.kind === 'failed') {
    assert.equal(outcome.state.status, 'failed');
    assert.match(outcome.state.lastError ?? '', /misconfigured|missing env/i);
  }
});

test('deliverPostNewsletter records partial Postmark acceptance and fails retryably', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const events: EventDoc[] = [];

  const outcome = await deliverPostNewsletter(makePayload(makePost(), 'fiction', events), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients() {
      return ['accepted@example.com', 'failed@example.com'];
    },
    async sendEmail() {
      throw new PostmarkBatchSendError(
        'Postmark rejected 1 recipient',
        [{ to: 'accepted@example.com', messageId: 'pm-accepted', submittedAt: now.toISOString(), message: 'OK' }],
        [{ to: 'failed@example.com', errorCode: 406, message: 'Inactive recipient', submittedAt: now.toISOString() }],
        2,
      );
    },
  });

  assert.equal(outcome.kind, 'failed');
  if (outcome.kind === 'failed') {
    assert.equal(outcome.state.status, 'failed');
    assert.equal(outcome.state.messageId, 'pm-accepted');
    assert.equal(outcome.state.recipientCount, 2);
    assert.equal(outcome.state.acceptedCount, 1);
    assert.equal(outcome.state.failedCount, 1);
    assert.match(outcome.state.lastError ?? '', /Postmark rejected 1 recipient/);
  }
  assert.equal(events.length, 1);
  assert.equal(events[0].recipientEmail, 'accepted@example.com');
});

test('REGRESSION: stale submitted events from another attempt do NOT short-circuit the send', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  // A pre-existing "submitted" row from a *different* (or legacy) attempt.
  // This is the production poisoning bug: such rows must be ignored.
  const events: EventDoc[] = [
    {
      id: 1,
      post: 1,
      messageId: 'pm-phantom',
      eventType: 'submitted',
      recipientEmail: 'reader@example.com',
      occurredAt: '2026-06-01T12:00:00.000Z',
      metadata: { attemptId: 'OLD-attempt' },
    },
  ];
  const sentTo: string[][] = [];

  const outcome = await deliverPostNewsletter(makePayload(makePost(), 'fiction', events), 1, {
    now: () => now,
    generateAttemptId: () => 'attempt-new',
    async resolveRecipients() {
      return ['reader@example.com'];
    },
    async sendEmail(options) {
      sentTo.push(options.to);
      return {
        messageIds: ['pm-real'],
        recipientCount: options.to.length,
        accepted: [{ to: options.to[0], messageId: 'pm-real', submittedAt: now.toISOString(), message: 'OK' }],
      };
    },
  });

  // The stale row is ignored → Postmark IS called for the recipient.
  assert.equal(outcome.kind, 'sent');
  assert.deepEqual(sentTo, [['reader@example.com']]);
  if (outcome.kind === 'sent') {
    assert.equal(outcome.state.attemptId, 'attempt-new');
    // Only this attempt's event counts toward acceptedCount.
    assert.equal(outcome.state.acceptedCount, 1);
    assert.equal(outcome.state.messageId, 'pm-real');
  }
});

test('crash-resume within the same attempt skips already-accepted recipients', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  // Same attempt id on both the post and the existing event → verified resume.
  const events: EventDoc[] = [
    {
      id: 1,
      post: 1,
      messageId: 'pm-existing',
      eventType: 'submitted',
      recipientEmail: 'reader@example.com',
      occurredAt: '2026-06-06T12:00:00.000Z',
      metadata: { attemptId: 'attempt-resume' },
    },
  ];
  const sentTo: string[][] = [];
  const post = makePost({ newsletterSend: { attemptId: 'attempt-resume', status: 'submitted' } });

  const outcome = await deliverPostNewsletter(makePayload(post, 'fiction', events), 1, {
    now: () => now,
    async resolveRecipients() {
      return ['reader@example.com', 'new@example.com'];
    },
    async sendEmail(options) {
      sentTo.push(options.to);
      return {
        messageIds: ['pm-new'],
        recipientCount: options.to.length,
        accepted: [{ to: 'new@example.com', messageId: 'pm-new', submittedAt: now.toISOString(), message: 'OK' }],
      };
    },
  });

  assert.equal(outcome.kind, 'sent');
  // Only the not-yet-accepted recipient is sent; the resumed one is skipped.
  assert.deepEqual(sentTo, [['new@example.com']]);
  if (outcome.kind === 'sent') {
    assert.equal(outcome.state.attemptId, 'attempt-resume');
    assert.equal(outcome.state.recipientCount, 2);
    assert.equal(outcome.state.acceptedCount, 2);
    assert.equal(outcome.state.messageId, 'pm-existing,pm-new');
  }
});

test('REGRESSION: attemptId is persisted to the post BEFORE the first Postmark call', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const updates: PostUpdate[] = [];
  let attemptIdPersistedBeforeSend = false;

  const outcome = await deliverPostNewsletter(makePayload(makePost(), 'fiction', [], updates), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients() {
      return ['reader@example.com'];
    },
    async sendEmail(options) {
      // If the process died right here, the persisted attemptId is what lets
      // the retry resume this attempt instead of re-sending to everyone.
      attemptIdPersistedBeforeSend = updates.some((update) => {
        const send = update.data.newsletterSend as { attemptId?: string } | undefined;
        return send?.attemptId === 'attempt-test';
      });
      return {
        messageIds: ['pm-1'],
        recipientCount: options.to.length,
        accepted: [{ to: options.to[0], messageId: 'pm-1', submittedAt: now.toISOString(), message: 'OK' }],
      };
    },
  });

  assert.equal(outcome.kind, 'sent');
  assert.ok(attemptIdPersistedBeforeSend, 'attemptId must be written to the post before sendEmail runs');
});

test('REGRESSION: acceptances recorded per batch survive a crash mid-send and resume skips them', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  const events: EventDoc[] = [];
  const updates: PostUpdate[] = [];

  // First run: Postmark accepts batch 1 (reported via onBatchAccepted), then
  // the send dies with a generic error before completing.
  const first = await deliverPostNewsletter(makePayload(makePost(), 'fiction', events, updates), 1, {
    now: () => now,
    generateAttemptId: FIXED_ATTEMPT,
    async resolveRecipients() {
      return ['accepted@example.com', 'pending@example.com'];
    },
    async sendEmail(options) {
      await options.onBatchAccepted?.([
        { to: 'accepted@example.com', messageId: 'pm-batch-1', submittedAt: now.toISOString(), message: 'OK' },
      ]);
      throw new Error('process crashed mid-send');
    },
  });

  assert.equal(first.kind, 'failed');
  // The accepted recipient's submitted event was recorded before the crash.
  assert.equal(events.filter((event) => event.eventType === 'submitted').length, 1);

  // Second run: same attempt (as the pre-send persist guarantees in prod).
  const resumedPost = makePost({
    newsletterSend: { attemptId: 'attempt-test', status: 'failed' },
  });
  const sentTo: string[][] = [];
  const second = await deliverPostNewsletter(makePayload(resumedPost, 'fiction', events, updates), 1, {
    now: () => now,
    generateAttemptId: () => 'attempt-should-not-be-used',
    async resolveRecipients() {
      return ['accepted@example.com', 'pending@example.com'];
    },
    async sendEmail(options) {
      sentTo.push(options.to);
      return {
        messageIds: ['pm-batch-2'],
        recipientCount: options.to.length,
        accepted: [{ to: options.to[0], messageId: 'pm-batch-2', submittedAt: now.toISOString(), message: 'OK' }],
      };
    },
  });

  assert.equal(second.kind, 'sent');
  // Only the recipient Postmark never accepted is retried — no duplicate email.
  assert.deepEqual(sentTo, [['pending@example.com']]);
  if (second.kind === 'sent') {
    assert.equal(second.state.attemptId, 'attempt-test');
    assert.equal(second.state.acceptedCount, 2);
  }
});

test('deliverPostNewsletter derives delivered when every accepted message is confirmed', async () => {
  setAudienceEnv();
  const now = new Date('2026-06-06T13:00:00.000Z');
  // Resume where the single accepted message already has a delivery event.
  const events: EventDoc[] = [
    {
      id: 1,
      post: 1,
      messageId: 'pm-1',
      eventType: 'submitted',
      recipientEmail: 'reader@example.com',
      occurredAt: '2026-06-06T12:00:00.000Z',
      metadata: { attemptId: 'attempt-done' },
    },
    {
      id: 2,
      post: 1,
      messageId: 'pm-1',
      eventType: 'delivery',
      recipientEmail: 'reader@example.com',
      occurredAt: '2026-06-06T12:05:00.000Z',
      metadata: { attemptId: 'attempt-done' },
    },
  ];
  const post = makePost({ newsletterSend: { attemptId: 'attempt-done', status: 'submitted' } });

  const outcome = await deliverPostNewsletter(makePayload(post, 'fiction', events), 1, {
    now: () => now,
    async resolveRecipients() {
      return ['reader@example.com'];
    },
    async sendEmail() {
      throw new Error('should not send — already accepted this attempt');
    },
  });

  assert.equal(outcome.kind, 'sent');
  if (outcome.kind === 'sent') {
    assert.equal(outcome.state.status, 'delivered');
    assert.equal(outcome.state.acceptedCount, 1);
    assert.equal(outcome.state.deliveredCount, 1);
  }
});
