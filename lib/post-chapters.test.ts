import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPostsByChapter } from './post-chapters';
import type { BlogPost, Group } from './blog';

function fakePost(slug: string, chapter?: string): BlogPost {
  return {
    id: 0,
    slug,
    title: slug,
    date: '2026-01-01',
    excerpt: '',
    content: { root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } } as unknown as BlogPost['content'],
    chapter,
  };
}

function fakeGroup(posts: BlogPost[], chapters?: { title: string; slug: string }[]): Group {
  return {
    slug: 'g',
    title: 'Group',
    tags: [],
    chapters,
    posts,
  };
}

test('returns one bucket when no chapters are defined', () => {
  const group = fakeGroup([fakePost('a'), fakePost('b')]);
  const out = groupPostsByChapter(group);
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, null);
  assert.deepEqual(out[0].posts.map((p) => p.partIndex), [1, 2]);
});

test('groups posts by chapter and preserves global part indices', () => {
  const group = fakeGroup(
    [fakePost('intro'), fakePost('p1', 'cold-boot'), fakePost('p2', 'cold-boot'), fakePost('p3', 'thaw')],
    [{ title: 'Cold Boot', slug: 'cold-boot' }, { title: 'Thaw', slug: 'thaw' }],
  );
  const out = groupPostsByChapter(group);
  assert.equal(out.length, 3);
  // Unassigned bucket first
  assert.equal(out[0].slug, null);
  assert.deepEqual(out[0].posts.map((p) => p.post.slug), ['intro']);
  assert.equal(out[0].posts[0].partIndex, 1);
  assert.equal(out[1].slug, 'cold-boot');
  assert.equal(out[1].title, 'Cold Boot');
  assert.deepEqual(out[1].posts.map((p) => p.partIndex), [2, 3]);
  assert.equal(out[2].slug, 'thaw');
  assert.deepEqual(out[2].posts.map((p) => p.partIndex), [4]);
});

test('drops empty chapter buckets', () => {
  const group = fakeGroup(
    [fakePost('p1', 'cold-boot')],
    [{ title: 'Cold Boot', slug: 'cold-boot' }, { title: 'Empty', slug: 'empty' }],
  );
  const out = groupPostsByChapter(group);
  assert.deepEqual(out.map((s) => s.slug), ['cold-boot']);
});

test('posts referencing unknown chapter fall into unassigned bucket', () => {
  const group = fakeGroup(
    [fakePost('p1', 'mystery')],
    [{ title: 'Cold Boot', slug: 'cold-boot' }],
  );
  const out = groupPostsByChapter(group);
  assert.equal(out.length, 1);
  assert.equal(out[0].slug, null);
  assert.equal(out[0].posts[0].partIndex, 1);
});

test('returns empty when group has no posts', () => {
  const group = fakeGroup([]);
  const out = groupPostsByChapter(group);
  assert.deepEqual(out, []);
});
