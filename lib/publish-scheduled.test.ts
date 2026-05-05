import assert from 'node:assert/strict';
import test from 'node:test';

import { promoteScheduledDraftHook } from '../collections/hooks/promoteScheduledDraft';
import { publishScheduledPosts } from './publishScheduled';

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
  stuck?: PostDoc[];
  updateError?: (id: number) => Error | undefined;
}) {
  const findCalls: FindArgs[] = [];
  const updateCalls: UpdateArgs[] = [];
  let findIndex = 0;
  const findResults = [
    { docs: opts.due ?? [], totalDocs: (opts.due ?? []).length },
    { docs: opts.stuck ?? [], totalDocs: (opts.stuck ?? []).length },
  ];

  return {
    findCalls,
    updateCalls,
    payload: {
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

  const result = await publishScheduledPosts(payload, { now });

  assert.equal(result.due, 2);
  assert.equal(result.processed, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.stuck, 0);
  assert.deepEqual(result.stuckPosts, []);
  assert.equal(updateCalls.length, 2);
  assert.equal(updateCalls[0].data.publish_status, 'published');
  assert.equal(updateCalls[0].data.publishedDate, '2026-05-04T12:00:00.000Z');
  // Both find calls (due + stuck) issued.
  assert.equal(findCalls.length, 2);
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

  const result = await publishScheduledPosts(payload, { now });

  assert.equal(result.stuck, 1);
  assert.equal(result.stuckPosts.length, 1);
  assert.equal(result.stuckPosts[0].id, 99);
  assert.equal(result.stuckPosts[0].publish_status, 'draft');
});

test('publishScheduledPosts uses now() as fallback publishedDate when scheduledPublishDate is absent', async () => {
  const due = [{ id: 7, slug: 'c', publish_status: 'scheduled', scheduledPublishDate: null }];
  const { payload, updateCalls } = makePayload({ due });
  const now = new Date('2026-05-04T14:00:00.000Z');

  await publishScheduledPosts(payload, { now });

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

  const result = await publishScheduledPosts(payload, { now });

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 1);
  const failed = result.results.find((r) => r.status === 'failed');
  assert.equal(failed?.error, 'boom');
});
