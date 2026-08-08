import assert from 'node:assert/strict';
import test from 'node:test';
import type { Payload } from 'payload';

import { buildStaticSitemapEntries, loadCmsSitemapEntries } from './sitemap';

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

test('buildStaticSitemapEntries maps configured routes without synthetic modification dates', () => {
  const entries = buildStaticSitemapEntries('https://example.test');

  assert.equal(entries[0]?.url, 'https://example.test/');
  assert.equal(
    entries.some(entry => entry.url === 'https://example.test/bibliography'),
    true,
  );
  // /portfolio plus Gallery View — the other six moved to the collection.
  assert.equal(
    entries.filter(entry => entry.url.includes('/portfolio')).length,
    2,
  );
  // The collection index plus its seven stories.
  assert.equal(
    entries.filter(entry => entry.url.includes('/this-is-what-i-do-for-fun')).length,
    8,
  );
  assert.equal(entries.find(entry => entry.url.endsWith('/projects'))?.priority, 0.9);
  assert.equal(entries.every(entry => entry.lastModified === undefined), true);
});

test('loadCmsSitemapEntries loads every group and post without fixed caps', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const groups = Array.from({ length: 501 }, (_, i) => ({
    id: i + 1,
    slug: `group-${i + 1}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
  const posts = Array.from({ length: 1001 }, (_, i) => ({
    id: i + 1,
    slug: `post-${i + 1}`,
    group: `group-${(i % 3) + 1}`,
    updatedAt: '2026-01-02T00:00:00.000Z',
  }));
  const payload = {
    async find(args: Record<string, unknown>) {
      calls.push(args);
      if (args.collection === 'groups') return result(groups);
      if (args.collection === 'posts') return result(posts);
      throw new Error(`Unexpected collection: ${String(args.collection)}`);
    },
  } as Pick<Payload, 'find'>;

  const entries = await loadCmsSitemapEntries(
    payload,
    'https://example.test',
    new Date('2026-01-03T00:00:00.000Z'),
  );

  assert.equal(entries.length, 1502);
  assert.equal(entries.some(entry => entry.url === 'https://example.test/projects/group-501'), true);
  assert.equal(
    entries.some(entry => entry.url === 'https://example.test/projects/group-2/post-1001'),
    true,
  );
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.pagination, false);
    assert.equal('limit' in call, false);
    assert.equal(call.overrideAccess, true);
  }
});
