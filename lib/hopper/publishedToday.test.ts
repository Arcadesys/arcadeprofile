import assert from 'node:assert/strict';
import test from 'node:test';

import type { Post } from '@/payload-types';

import { loadPublishedToday } from './publishedToday';

type PublishedTodayPayload = Parameters<typeof loadPublishedToday>[0];

const NOW = new Date('2026-05-13T16:00:00.000Z');

function makePost(id: number, publishedDate: string): Post {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    excerpt: '',
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
    publishedDate,
    publish_status: 'sent',
    updatedAt: publishedDate,
    createdAt: publishedDate,
  } as Post;
}

test('loadPublishedToday reads every matching public post without a fixed cap', async () => {
  const docs = Array.from({ length: 75 }, (_, i) =>
    makePost(i + 1, `2026-05-13T${String(12 + (i % 4)).padStart(2, '0')}:00:00.000Z`),
  );
  const calls: Array<{ limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    async find(args: { limit?: unknown; pagination?: unknown }) {
      calls.push(args);
      return paginated(docs);
    },
  } as unknown as PublishedTodayPayload;

  const result = await loadPublishedToday(payload, NOW);

  assert.equal(result.posts.length, 75);
  assert.deepEqual([...result.takenDates], ['2026-05-13']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.pagination, false);
  assert.equal('limit' in calls[0]!, false);
});

function paginated<T>(docs: T[]) {
  return {
    docs,
    totalDocs: docs.length,
    limit: docs.length,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };
}
