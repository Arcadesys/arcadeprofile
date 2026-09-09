import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';

import { loadMarkdownDrafts } from './markdown-drafts';
import {
  loadMarkdownPosts,
  loadMarkdownGroups,
  markdownPostFrontmatterSchema,
  selectPublicMarkdownPosts,
} from './markdown-posts';

const FIXTURES_DIRECTORY = path.join(process.cwd(), 'lib', 'fixtures', 'markdown-posts');

test('loads strict Markdown post frontmatter in deterministic group and post order', () => {
  const posts = loadMarkdownPosts({ contentDirectory: FIXTURES_DIRECTORY });

  assert.deepEqual(posts.map((post) => `${post.group}/${post.slug}`), [
    'alpha/first',
    'alpha/second',
    'beta/future',
  ]);
  assert.equal(posts[0]?.body, '# First Alpha Post\n\nThe first fixture post.');
  assert.equal(posts[0]?.hero?.alt, 'A clear description of the alpha hero image.');
});

test('loads strict group manifests alongside post directories', () => {
  const groups = loadMarkdownGroups({ contentDirectory: FIXTURES_DIRECTORY });
  assert.deepEqual(groups.map((group) => group.slug), ['alpha', 'beta']);
  assert.equal(groups[0]?.title, 'Alpha');
});

test('publishDate is the sole visibility control and can use an injected current time', () => {
  const posts = loadMarkdownPosts({ contentDirectory: FIXTURES_DIRECTORY });
  const publicPosts = selectPublicMarkdownPosts(posts, new Date('2026-08-22T00:00:00Z'));

  assert.deepEqual(publicPosts.map((post) => post.id), ['alpha-first', 'alpha-second']);
});

test('strict frontmatter rejects unknown fields, status fields, and incomplete hero accessibility text', () => {
  const base = {
    id: 'valid-post',
    title: 'Valid Post',
    slug: 'valid-post',
    group: 'valid-group',
    publishDate: '2026-08-20T09:00:00-05:00',
  };

  assert.equal(markdownPostFrontmatterSchema.safeParse({ ...base, status: 'published' }).success, false);
  assert.equal(markdownPostFrontmatterSchema.safeParse({ ...base, previewToken: 'secret' }).success, false);
  assert.equal(
    markdownPostFrontmatterSchema.safeParse({
      ...base,
      hero: { src: '/hero.webp', alt: '   ' },
    }).success,
    false,
  );
});

test('frontmatter preserves legacy zero-based ordering', () => {
  const base = {
    id: 'legacy-zero-order',
    title: 'Legacy Zero Order',
    slug: 'legacy-zero-order',
    group: 'valid-group',
    publishDate: '2026-08-20T09:00:00-05:00',
  };
  assert.equal(markdownPostFrontmatterSchema.safeParse({ ...base, order: 0 }).success, true);
  assert.equal(markdownPostFrontmatterSchema.safeParse({ ...base, order: -1 }).success, false);
});

test('frontmatter requires a valid RFC 3339 date-time offset or Z suffix', () => {
  const base = {
    id: 'valid-post',
    title: 'Valid Post',
    slug: 'valid-post',
    group: 'valid-group',
  };

  assert.equal(
    markdownPostFrontmatterSchema.safeParse({ ...base, publishDate: '2026-08-20T09:00:00Z' }).success,
    true,
  );
  assert.equal(
    markdownPostFrontmatterSchema.safeParse({ ...base, publishDate: '2026-08-20T09:00:00-05:00' }).success,
    true,
  );
  assert.equal(
    markdownPostFrontmatterSchema.safeParse({ ...base, publishDate: '2026-08-20' }).success,
    false,
  );
  assert.equal(
    markdownPostFrontmatterSchema.safeParse({ ...base, publishDate: '2026-02-30T09:00:00Z' }).success,
    false,
  );
});

test('loader rejects filename and directory disagreement, duplicate ids and slugs, and empty bodies', () => {
  const fixture = (name: string) => path.join(process.cwd(), 'lib', 'fixtures', 'markdown-posts-invalid', name);

  assert.throws(() => loadMarkdownPosts({ contentDirectory: fixture('filename-slug') }), /expected wrong from its filename/);
  assert.throws(() => loadMarkdownPosts({ contentDirectory: fixture('directory-group') }), /expected .* from its directory/);
  assert.throws(() => loadMarkdownPosts({ contentDirectory: fixture('duplicate-id') }), /Duplicate Markdown post id/);
  assert.throws(() => loadMarkdownPosts({ contentDirectory: fixture('duplicate-slug') }), /Duplicate Markdown post slug/);
  assert.throws(() => loadMarkdownPosts({ contentDirectory: fixture('empty-body') }), /nonempty Markdown body/);
});

test('checked-in corpus excludes retired fiction editions', () => {
  const contentDirectory = path.join(process.cwd(), 'content', 'posts');
  const posts = loadMarkdownPosts({ contentDirectory });
  const groups = loadMarkdownGroups({ contentDirectory });
  const retiredGroups = new Set(['parts-of-the-whole', 'short-stories']);
  const retiredSlugs = new Set([
    'carl',
    'ginnys-magic',
    'our-hope-chest-1-the-attic',
    'our-hope-chest-2-coney-beach',
    'parts-of-the-whole-1-the-arrival',
    'parts-of-the-whole-2-pressure-and-possibility',
    'parts-of-the-whole-3-what-you-could-have',
    'parts-of-the-whole-4-grace',
    'parts-of-the-whole-5-after',
  ]);

  assert.equal(groups.some((group) => retiredGroups.has(group.slug)), false);
  assert.equal(posts.some((post) => retiredGroups.has(post.group) || retiredSlugs.has(post.slug)), false);
  assert.equal(posts.find((post) => post.slug === 'open-port')?.publishDate, '2026-08-21T17:00:00.000Z');
});

test('checked-in Payload draft is hash-verified and absent from the public corpus', () => {
  const drafts = loadMarkdownDrafts();
  const posts = loadMarkdownPosts();
  const draft = drafts.find((item) => item.slug === 'the-fox-and-the-eval');
  assert.ok(draft);
  assert.equal(createHash('sha256').update(draft.body).digest('hex'), draft.source.bodySha256);
  assert.equal(posts.some((post) => post.slug === draft.slug), false);
});
