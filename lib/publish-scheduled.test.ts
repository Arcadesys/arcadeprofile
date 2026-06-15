import assert from 'node:assert/strict';
import test from 'node:test';

import { promoteScheduledDraftHook } from '../collections/hooks/promoteScheduledDraft';
import type { NewsletterDeliveryOutcome } from './post-newsletter-delivery';
import { publishScheduledPosts, type PayloadLike } from './publishScheduled';

test('promoteScheduledDraftHook flips draft to scheduled when a date is set', () => {
  const data = { publish_status: 'draft', scheduledPublishDate: '2026-06-01T12:00:00.000Z' };
  const result = promoteScheduledDraftHook({ data });
  assert.equal(result.publish_status, 'scheduled');
});

test('promoteScheduledDraftHook flips missing status to scheduled when a date is set', () => {
  const data: Record<string, unknown> = { scheduledPublishDate: '2026-06-01T12:00:00.000Z' };
  const result = promoteScheduledDraftHook({ data });
  assert.equal(result.publish_status, 'scheduled');
});

test('promoteScheduledDraftHook leaves draft alone when no date is set', () => {
  const data = { publish_status: 'draft', scheduledPublishDate: null };
  const result = promoteScheduledDraftHook({ data });
  assert.equal(result.publish_status, 'draft');
});

test('promoteScheduledDraftHook does not overwrite an explicit non-draft status', () => {
  const data = { publish_status: 'published', scheduledPublishDate: '2026-06-01T12:00:00.000Z' };
  const result = promoteScheduledDraftHook({ data });
  assert.equal(result.publish_status, 'published');
});

type FindArgs = Record<string, unknown>;
type UpdateArgs = { collection: string; id: number; data: Record<string, unknown> };
type PostDoc = Record<string, unknown> & { id: number };

function makePayload(opts: {
  due?: PostDoc[];
  retry?: PostDoc[];
  stuck?: PostDoc[];
  updateError?: (id: number) => Error | undefined;
}) {
  const findCalls: FindArgs[] = [];
  const updateCalls: UpdateArgs[] = [];
  let findIndex = 0;
  const findResults = [
    { docs: opts.due ?? [], totalDocs: (opts.due ?? []).length },
    { docs: opts.retry ?? [], totalDocs: (opts.retry ?? []).length },
    { docs: opts.stuck ?? [], totalDocs: (opts.stuck ?? []).length },
  ];

  const mock = {
    async find(args: FindArgs) {
      findCalls.push(args);
      return findResults[findIndex++];
    },
    async update(args: UpdateArgs) {
      updateCalls.push(args);
      const err = opts.updateError?.(args.id);
      if (err) throw err;
      return { id: args.id };
    },
    async findByID(args: { id: number }) {
      return [...(opts.due ?? []), ...(opts.retry ?? []), ...(opts.stuck ?? [])].find(
        (post) => post.id === args.id,
      );
    },
  };

  return {
    findCalls,
    updateCalls,
    payload: mock as unknown as PayloadLike,
  };
}

function sentNewsletter(): NewsletterDeliveryOutcome {
  return {
    kind: 'sent',
    state: {
      status: 'sent',
      messageId: 'pm-1',
      targetedLists: '7,9',
      recipientCount: 1,
      sentAt: '2026-05-04T14:00:00.000Z',
      lastSyncedAt: '2026-05-04T14:00:00.000Z',
      lastError: null,
    },
  };
}

test('publishScheduledPosts publishes due posts and reports zero stuck on a clean run', async () => {
  const due = [
    { id: 1, slug: 'a', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
    { id: 2, slug: 'b', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T13:00:00.000Z' },
  ];
  const { payload, updateCalls, findCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(result.due, 2);
  assert.equal(result.processed, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.stuck, 0);
  assert.deepEqual(result.stuckPosts, []);
  assert.equal(updateCalls.length, 6);
  assert.equal(updateCalls[0].data.publish_status, 'published');
  assert.equal(updateCalls[0].data.publishedDate, '2026-05-04T12:00:00.000Z');
  assert.deepEqual(updateCalls[1].data.newsletterSend, {
    status: 'pending',
    lastSyncedAt: now.toISOString(),
    lastError: null,
  });
  assert.equal(updateCalls[2].data.publish_status, 'sent');
  assert.deepEqual(updateCalls[2].data.newsletterSend, sentNewsletter().state);
  // Due, retry, and stuck find calls issued.
  assert.equal(findCalls.length, 3);
});

test('publishScheduledPosts surfaces stuck posts past the grace window', async () => {
  const stuck = [
    {
      id: 99,
      slug: 'mailbox',
      publish_status: 'draft',
      scheduledPublishDate: '2026-05-03T12:00:00.000Z',
    },
  ];
  const { payload } = makePayload({ stuck });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(result.stuck, 1);
  assert.equal(result.stuckPosts.length, 1);
  assert.equal(result.stuckPosts[0].id, 99);
  assert.equal(result.stuckPosts[0].publish_status, 'draft');
});

test('publishScheduledPosts self-heals: publishes draft posts whose scheduled date is past', async () => {
  // A post that should have been promoted to `scheduled` but is still
  // `draft` (e.g. legacy row, the beforeChange hook never ran). The publish
  // loop should still pick it up so it doesn't sit forever in the stuck list.
  const due = [
    { id: 42, slug: 'orphan', publish_status: 'draft', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
  ];
  const { payload, updateCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.equal(updateCalls.length, 3);
  assert.equal(updateCalls[0].data.publish_status, 'published');
  assert.deepEqual(updateCalls[1].data.newsletterSend, {
    status: 'pending',
    lastSyncedAt: now.toISOString(),
    lastError: null,
  });
  assert.equal(updateCalls[2].data.publish_status, 'sent');
});

test('publishScheduledPosts uses now() as fallback publishedDate when scheduledPublishDate is absent', async () => {
  const due = [{ id: 7, slug: 'c', publish_status: 'scheduled', scheduledPublishDate: null }];
  const { payload, updateCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(updateCalls[0].data.publishedDate, now.toISOString());
});

test('publishScheduledPosts records failed updates without aborting the batch', async () => {
  const due = [
    { id: 1, slug: 'a', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
    { id: 2, slug: 'b', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T13:00:00.000Z' },
  ];
  const { payload } = makePayload({
    due,
    updateError: (id) => (id === 1 ? new Error('boom') : undefined),
  });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 1);
  const failed = result.results.find((r) => r.status === 'failed');
  assert.equal(failed?.error, 'boom');
});

test('publishScheduledPosts records skipped newsletter state for suppressed posts', async () => {
  const due = [
    { id: 1, slug: 'a', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
  ];
  const { payload, updateCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => ({
      kind: 'skipped',
      reason: 'suppressNewsletter',
      state: {
        status: 'skipped',
        lastSyncedAt: now.toISOString(),
        lastError: null,
      },
    }),
  });

  assert.equal(result.results[0].newsletter, 'skipped');
  assert.deepEqual(updateCalls[1].data.newsletterSend, {
    status: 'pending',
    lastSyncedAt: now.toISOString(),
    lastError: null,
  });
  assert.equal(updateCalls[2].data.publish_status, undefined);
  assert.deepEqual(updateCalls[2].data.newsletterSend, {
    status: 'skipped',
    lastSyncedAt: now.toISOString(),
    lastError: null,
  });
});

test('publishScheduledPosts leaves post published when newsletter send fails', async () => {
  const due = [
    { id: 1, slug: 'a', publish_status: 'scheduled', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
  ];
  const { payload, updateCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => ({
      kind: 'failed',
      state: {
        status: 'failed',
        lastSyncedAt: now.toISOString(),
        lastError: 'Postmark down',
      },
      error: new Error('Postmark down'),
    }),
  });

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.equal(result.results[0].newsletter, 'failed');
  assert.equal(result.results[0].newsletterError, 'Postmark down');
  assert.equal(updateCalls[0].data.publish_status, 'published');
  assert.deepEqual(updateCalls[1].data.newsletterSend, {
    status: 'pending',
    lastSyncedAt: now.toISOString(),
    lastError: null,
  });
  assert.equal(updateCalls[2].data.publish_status, undefined);
  assert.deepEqual(updateCalls[2].data.newsletterSend, {
    status: 'failed',
    lastSyncedAt: now.toISOString(),
    lastError: 'Postmark down',
  });
});

test('publishScheduledPosts retries failed newsletter sends for already-published posts', async () => {
  const retry = [
    { id: 9, slug: 'retry-me', publish_status: 'published', scheduledPublishDate: '2026-05-04T12:00:00.000Z' },
  ];
  const { payload, updateCalls } = makePayload({ retry });
  const now = new Date('2026-05-04T14:00:00.000Z');

  const result = await publishScheduledPosts(payload, {
    now,
    deliverNewsletter: async () => sentNewsletter(),
  });

  assert.equal(result.processed, 1);
  assert.equal(result.results[0].id, 9);
  assert.equal(result.results[0].newsletter, 'sent');
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].data.publish_status, 'sent');
});
