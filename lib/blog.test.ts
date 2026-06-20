import assert from 'node:assert/strict';
import test from 'node:test';
import type { Payload } from 'payload';

import type { Group as PayloadGroup, Page as PayloadPage, Post } from '@/payload-types';

import { loadAllPages, loadAllPosts, loadGroupBySlug, loadUngroupedPosts } from './blog';

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

const emptyContent = {
  root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
} as Post['content'];

function post(overrides: Partial<Post>): Post {
  return {
    id: 1,
    title: 'Post',
    slug: 'post',
    excerpt: '',
    content: emptyContent,
    publishedDate: '2026-01-01T00:00:00.000Z',
    publish_status: 'published',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Post;
}

function group(overrides: Partial<PayloadGroup> = {}): PayloadGroup {
  return {
    id: 1,
    title: 'Project Hub',
    slug: 'project-hub',
    tags: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as PayloadGroup;
}

function page(overrides: Partial<PayloadPage> = {}): PayloadPage {
  return {
    id: 1,
    title: 'Page',
    slug: 'page',
    content: emptyContent,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as PayloadPage;
}

test('loadGroupBySlug returns an existing group even when it has no posts', async () => {
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown }) => {
      calls.push(args);
      if (args.collection === 'groups') {
        return paginated([
          group({
            meta: { title: 'Custom Meta Title', description: 'Custom meta description.' },
          }),
        ]);
      }
      if (args.collection === 'posts') return paginated([]);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadGroupBySlug(payload, 'project-hub');

  assert.equal(result?.slug, 'project-hub');
  assert.deepEqual(result?.posts, []);
  assert.equal(result?.meta?.title, 'Custom Meta Title');
  assert.deepEqual(calls.map((call) => call.collection), ['groups', 'posts']);
  assert.deepEqual(calls[0]!.where, { slug: { equals: 'project-hub' } });
});

test('loadGroupBySlug loads and orders public group posts', async () => {
  const posts = [
    post({ id: 1, slug: 'late', group: 'project-hub', order: null, publishedDate: '2026-01-03T00:00:00.000Z' }),
    post({ id: 2, slug: 'second', group: 'project-hub', order: 2, publishedDate: '2026-01-01T00:00:00.000Z' }),
    post({ id: 3, slug: 'first', group: 'project-hub', order: 1, publishedDate: '2026-01-02T00:00:00.000Z' }),
  ];
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown }) => {
      calls.push(args);
      if (args.collection === 'groups') return paginated([group()]);
      if (args.collection === 'posts') return paginated(posts);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadGroupBySlug(payload, 'project-hub');

  assert.deepEqual(result?.posts.map((p) => p.slug), ['first', 'second', 'late']);
  assert.deepEqual(calls[1]!.where, {
    and: [
      { group: { equals: 'project-hub' } },
      { publish_status: { in: ['published', 'sent'] } },
    ],
  });
  assert.equal(calls[1]!.pagination, false);
  assert.equal('limit' in calls[1]!, false);
});

test('loadGroupBySlug includes every public group post without a fixed cap', async () => {
  const posts = Array.from({ length: 125 }, (_, i) =>
    post({
      id: i + 1,
      slug: `part-${i + 1}`,
      group: 'project-hub',
      order: i + 1,
      publishedDate: '2026-01-01T00:00:00.000Z',
    }),
  );
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown; limit?: unknown; pagination?: unknown }) => {
      calls.push(args);
      if (args.collection === 'groups') return paginated([group()]);
      if (args.collection === 'posts') return paginated(posts);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadGroupBySlug(payload, 'project-hub');

  assert.equal(result?.posts.length, 125);
  assert.equal(result?.posts.at(-1)?.slug, 'part-125');
  assert.equal(calls[1]!.pagination, false);
  assert.equal('limit' in calls[1]!, false);
});

test('loadAllPosts includes every public post without a fixed cap', async () => {
  const posts = Array.from({ length: 125 }, (_, i) =>
    post({
      id: i + 1,
      slug: `post-${i + 1}`,
      group: `group-${(i % 3) + 1}`,
      publishedDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    }),
  );
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown; limit?: unknown; pagination?: unknown }) => {
      calls.push(args);
      if (args.collection === 'posts') return paginated(posts);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadAllPosts(payload);

  assert.equal(result.length, 125);
  assert.equal(result.at(-1)?.slug, 'post-125');
  assert.equal(calls[0]!.pagination, false);
  assert.equal('limit' in calls[0]!, false);
});

test('loadAllPages includes every published page without a fixed cap', async () => {
  const pages = Array.from({ length: 125 }, (_, i) =>
    page({
      id: i + 1,
      slug: `page-${i + 1}`,
      title: `Page ${i + 1}`,
    }),
  );
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown; limit?: unknown; pagination?: unknown }) => {
      calls.push(args);
      if (args.collection === 'pages') return paginated(pages);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadAllPages(payload);

  assert.equal(result.length, 125);
  assert.equal(result.at(-1)?.slug, 'page-125');
  assert.equal(calls[0]!.pagination, false);
  assert.equal('limit' in calls[0]!, false);
});

test('loadUngroupedPosts includes every public ungrouped post without a fixed cap', async () => {
  const posts = Array.from({ length: 125 }, (_, i) =>
    post({
      id: i + 1,
      slug: `loose-${i + 1}`,
      group: i % 2 === 0 ? '' : undefined,
      publishedDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    }),
  );
  const calls: Array<{ collection: string; where?: unknown; limit?: unknown; pagination?: unknown }> = [];
  const payload = {
    find: async (args: { collection: string; where?: unknown; limit?: unknown; pagination?: unknown }) => {
      calls.push(args);
      if (args.collection === 'posts') return paginated(posts);
      throw new Error(`Unexpected collection: ${args.collection}`);
    },
  } as Pick<Payload, 'find'>;

  const result = await loadUngroupedPosts(payload);

  assert.equal(result.length, 125);
  assert.equal(result.at(-1)?.slug, 'loose-125');
  assert.equal(calls[0]!.pagination, false);
  assert.equal('limit' in calls[0]!, false);
});
