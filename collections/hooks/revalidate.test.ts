import assert from 'node:assert/strict';
import test from 'node:test';
import type { Payload } from 'payload';

import {
  buildGroupRevalidationPaths,
  Groups,
  loadGroupPostSlugsForRevalidation,
} from '../Groups';
import { buildPageRevalidationPaths, Pages } from '../Pages';
import { buildPostRevalidationPaths, Posts } from '../Posts';
import { uniqueRevalidationPaths } from './revalidate';

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

test('post revalidation includes current and previous canonical URLs', () => {
  assert.deepEqual(
    buildPostRevalidationPaths(
      { slug: 'new-post', group: 'new-project' },
      { slug: 'old-post', group: 'old-project' },
    ),
    [
      '/latest',
      '/projects',
      '/feed.xml',
      '/projects/new-project',
      '/projects/new-project/new-post',
      '/projects/old-project',
      '/projects/old-project/old-post',
    ],
  );
});

test('post revalidation dedupes unchanged paths', () => {
  assert.deepEqual(
    buildPostRevalidationPaths(
      { slug: 'same-post', group: 'same-project' },
      { slug: 'same-post', group: 'same-project' },
    ),
    [
      '/latest',
      '/projects',
      '/feed.xml',
      '/projects/same-project',
      '/projects/same-project/same-post',
    ],
  );
});

test('page revalidation includes current and previous slug paths', () => {
  assert.deepEqual(
    buildPageRevalidationPaths({ slug: 'new-page' }, { slug: 'old-page' }),
    ['/new-page', '/old-page'],
  );
});

test('group revalidation includes indexes, old/new group pages, and related post pages', () => {
  const postSlugsByGroup = new Map([
    ['new-project', ['new-part', 'second-part']],
    ['old-project', ['old-part']],
  ]);

  assert.deepEqual(
    buildGroupRevalidationPaths(
      { slug: 'new-project' },
      { slug: 'old-project' },
      postSlugsByGroup,
    ),
    [
      '/',
      '/latest',
      '/projects',
      '/feed.xml',
      '/sitemap.xml',
      '/projects/new-project',
      '/projects/new-project/new-part',
      '/projects/new-project/second-part',
      '/projects/old-project',
      '/projects/old-project/old-part',
    ],
  );
});

test('group revalidation loads every public post for affected groups without a fixed cap', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const posts = Array.from({ length: 10_001 }, (_, index) => ({
    id: index + 1,
    slug: `part-${index + 1}`,
    group: index === 10_000 ? 'other-project' : 'project',
  }));
  const payload = {
    async find(args: Record<string, unknown>) {
      calls.push(args);
      assert.equal(args.collection, 'posts');
      return result(posts);
    },
  } as Pick<Payload, 'find'>;

  const postSlugsByGroup = await loadGroupPostSlugsForRevalidation(payload, [
    'project',
    'other-project',
  ]);

  assert.equal(postSlugsByGroup.get('project')?.length, 10_000);
  assert.deepEqual(postSlugsByGroup.get('other-project'), ['part-10001']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.pagination, false);
  assert.equal(calls[0]?.overrideAccess, true);
  assert.equal('limit' in calls[0]!, false);
});

test('revalidation path normalization removes duplicates and empty paths', () => {
  assert.deepEqual(
    uniqueRevalidationPaths(['/latest', '', '/latest', '/projects']),
    ['/latest', '/projects'],
  );
});

test('public content collections revalidate paths after delete', () => {
  assert.equal(Posts.hooks?.afterDelete?.length, 1);
  assert.equal(Pages.hooks?.afterDelete?.length, 1);
  assert.equal(Groups.hooks?.afterDelete?.length, 1);
});
