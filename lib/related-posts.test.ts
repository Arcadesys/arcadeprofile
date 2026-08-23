import assert from 'node:assert/strict';
import test from 'node:test';

import type { BlogPost, PostLocation } from './blog';
import { getRelatedPosts } from './related-posts';

function post(overrides: Partial<BlogPost> & { slug: string }): BlogPost {
  return {
    id: 1,
    title: overrides.slug,
    date: '2026-01-01T00:00:00.000Z',
    excerpt: '',
    markdownBody: 'Body.',
    group: 'default-group',
    tags: [],
    ...overrides,
  };
}

function locate(posts: Array<{ slug: string; groupSlug: string; groupTitle?: string }>): Map<string, PostLocation> {
  const map = new Map<string, PostLocation>();
  posts.forEach(({ slug, groupSlug, groupTitle }, i) => {
    map.set(slug, { groupSlug, groupTitle: groupTitle ?? groupSlug, partIndex: i + 1 });
  });
  return map;
}

test('getRelatedPosts excludes posts from the same group as current', () => {
  const current = post({ slug: 'current', group: 'series-a', tags: ['noir'] });
  const sameGroup = post({ slug: 'sibling', group: 'series-a', tags: ['noir'] });
  const otherGroup = post({ slug: 'other', group: 'series-b', tags: ['noir'] });
  const urlMap = locate([
    { slug: 'current', groupSlug: 'series-a' },
    { slug: 'sibling', groupSlug: 'series-a' },
    { slug: 'other', groupSlug: 'series-b' },
  ]);

  const related = getRelatedPosts([current, sameGroup, otherGroup], current, urlMap);

  assert.deepEqual(related.map((r) => r.slug), ['other']);
});

test('getRelatedPosts ranks by shared-tag overlap, then recency', () => {
  const current = post({ slug: 'current', group: 'series-a', tags: ['noir', 'paris'] });
  const noOverlap = post({ slug: 'no-overlap', group: 'series-b', tags: ['comedy'], date: '2026-01-05T00:00:00.000Z' });
  const oneTagOld = post({ slug: 'one-tag-old', group: 'series-c', tags: ['noir'], date: '2026-01-01T00:00:00.000Z' });
  const oneTagNew = post({ slug: 'one-tag-new', group: 'series-d', tags: ['noir'], date: '2026-01-10T00:00:00.000Z' });
  const twoTags = post({ slug: 'two-tags', group: 'series-e', tags: ['noir', 'paris'], date: '2026-01-02T00:00:00.000Z' });
  const urlMap = locate([
    { slug: 'current', groupSlug: 'series-a' },
    { slug: 'no-overlap', groupSlug: 'series-b' },
    { slug: 'one-tag-old', groupSlug: 'series-c' },
    { slug: 'one-tag-new', groupSlug: 'series-d' },
    { slug: 'two-tags', groupSlug: 'series-e' },
  ]);

  const related = getRelatedPosts(
    [current, noOverlap, oneTagOld, oneTagNew, twoTags],
    current,
    urlMap,
    3,
  );

  assert.deepEqual(related.map((r) => r.slug), ['two-tags', 'one-tag-new', 'one-tag-old']);
});

test('getRelatedPosts backfills with recent posts from other groups when tags do not fill the limit', () => {
  const current = post({ slug: 'current', group: 'series-a', tags: ['noir'] });
  const tagged = post({ slug: 'tagged', group: 'series-b', tags: ['noir'], date: '2026-01-01T00:00:00.000Z' });
  const untaggedOld = post({ slug: 'untagged-old', group: 'series-c', tags: [], date: '2026-01-02T00:00:00.000Z' });
  const untaggedNew = post({ slug: 'untagged-new', group: 'series-d', tags: [], date: '2026-01-03T00:00:00.000Z' });
  const urlMap = locate([
    { slug: 'current', groupSlug: 'series-a' },
    { slug: 'tagged', groupSlug: 'series-b' },
    { slug: 'untagged-old', groupSlug: 'series-c' },
    { slug: 'untagged-new', groupSlug: 'series-d' },
  ]);

  const related = getRelatedPosts([current, tagged, untaggedOld, untaggedNew], current, urlMap, 3);

  assert.deepEqual(related.map((r) => r.slug), ['tagged', 'untagged-new', 'untagged-old']);
});

test('getRelatedPosts skips candidates missing from the url map (ungrouped posts)', () => {
  const current = post({ slug: 'current', group: 'series-a', tags: [] });
  const ungrouped = post({ slug: 'ungrouped', tags: [] });
  const grouped = post({ slug: 'grouped', group: 'series-b', tags: [] });
  const urlMap = locate([
    { slug: 'current', groupSlug: 'series-a' },
    { slug: 'grouped', groupSlug: 'series-b' },
  ]);

  const related = getRelatedPosts([current, ungrouped, grouped], current, urlMap);

  assert.deepEqual(related.map((r) => r.slug), ['grouped']);
});

test('getRelatedPosts respects the limit', () => {
  const current = post({ slug: 'current', group: 'series-a', tags: [] });
  const others = Array.from({ length: 5 }, (_, i) =>
    post({ slug: `other-${i}`, group: `series-${i}`, tags: [], date: `2026-01-0${i + 1}T00:00:00.000Z` }),
  );
  const urlMap = locate([
    { slug: 'current', groupSlug: 'series-a' },
    ...others.map((p) => ({ slug: p.slug, groupSlug: p.group! })),
  ]);

  const related = getRelatedPosts([current, ...others], current, urlMap, 2);

  assert.equal(related.length, 2);
});
