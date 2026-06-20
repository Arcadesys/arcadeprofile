import assert from 'node:assert/strict';
import test from 'node:test';
import type { Payload } from 'payload';

import type { Group, Post } from '@/payload-types';

import { loadProjectHubs } from './payload';

function result<T>(docs: T[]) {
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

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 1,
    title: 'Project Hub',
    slug: 'project-hub',
    tags: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Group;
}

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'Post',
    slug: 'post',
    excerpt: '',
    content: {
      root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
    },
    publishedDate: '2026-01-01T00:00:00.000Z',
    publish_status: 'published',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Post;
}

test('loadProjectHubs includes every group and related public post without fixed caps', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const groups = Array.from({ length: 201 }, (_, i) =>
    group({ id: i + 1, title: `Group ${i + 1}`, slug: `group-${i + 1}` }),
  );
  const posts = Array.from({ length: 501 }, (_, i) =>
    post({
      id: i + 1,
      slug: `part-${i + 1}`,
      group: i === 500 ? 'group-201' : 'group-1',
      order: i + 1,
    }),
  );
  const payload = {
    async find(args: Record<string, unknown>) {
      calls.push(args);
      if (args.collection === 'groups') return result(groups);
      if (args.collection === 'posts') return result(posts);
      throw new Error(`Unexpected collection: ${String(args.collection)}`);
    },
  } as Pick<Payload, 'find'>;

  const hubs = await loadProjectHubs(payload);

  assert.equal(hubs.length, 201);
  assert.equal(hubs.find(hub => hub.slug === 'group-1')?.relatedPostSlugs.length, 500);
  assert.deepEqual(hubs.find(hub => hub.slug === 'group-201')?.relatedPostSlugs, ['part-501']);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.pagination, false);
  assert.equal(calls[1]?.pagination, false);
  assert.equal('limit' in calls[0]!, false);
  assert.equal('limit' in calls[1]!, false);
});
