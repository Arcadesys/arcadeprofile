import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  loadMarkdownPosts,
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
