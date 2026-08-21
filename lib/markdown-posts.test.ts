import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

test('checked-in corpus matches the authenticated Payload parity receipt', () => {
  const contentDirectory = path.join(process.cwd(), 'content', 'posts');
  const posts = loadMarkdownPosts({ contentDirectory });
  const groups = loadMarkdownGroups({ contentDirectory });
  const report = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'payload-markdown-parity.json'), 'utf8')) as {
    totals: { source: number; exported: number; excluded: number; blocked: number };
    records: Array<{ slug?: string; disposition: string; file?: string; reason?: string }>;
    validation: { passed: boolean };
  };
  const exportedFiles = report.records
    .filter((record) => record.disposition === 'exported')
    .map((record) => record.file)
    .sort();
  const loadedFiles = posts
    .map((post) => path.relative(contentDirectory, post.filePath).split(path.sep).join('/'))
    .sort();
  const essayGroups = new Set([
    'ai-art-experiments',
    'arcade-blog',
    'on-writing',
    'pride-essays',
    'the-singularity-log',
    'white-cane-chronicles',
  ]);

  assert.deepEqual(
    {
      source: report.totals.source,
      exported: report.totals.exported,
      excluded: report.totals.excluded,
      blocked: report.totals.blocked,
    },
    { source: 81, exported: 80, excluded: 1, blocked: 0 },
  );
  assert.equal(report.validation.passed, true);
  assert.deepEqual(loadedFiles, exportedFiles);
  assert.equal(groups.length, 9);
  assert.equal(posts.filter((post) => essayGroups.has(post.group)).length, 32);
  assert.deepEqual(
    report.records.filter((record) => record.disposition === 'excluded').map((record) => ({ slug: record.slug, reason: record.reason })),
    [{ slug: 'the-fox-and-the-eval', reason: 'preserved in non-public Markdown drafts' }],
  );
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
