import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadMarkdownPosts, selectPublicMarkdownPosts } from './markdown-posts';
import { collectPayloadPages, exportPayloadPosts, type PayloadPost } from './payload-markdown-export';

const groups = [{ slug: 'alpha' }];
const now = new Date('2026-08-20T12:00:00Z');

function post(overrides: Partial<PayloadPost> = {}): PayloadPost {
  return {
    id: 1, title: 'Exportable Post', slug: 'exportable-post', excerpt: 'A useful summary.',
    publishedDate: '2026-08-20T09:00:00Z', updatedAt: '2026-08-20T10:00:00Z', publish_status: 'published', group: 'alpha', order: 1,
    tags: [{ tag: 'testing' }], meta: { title: 'SEO title', description: 'SEO description', image: { id: 77, filename: 'hero.webp', alt: 'A testing hero image', url: '/api/media/hero.webp' } },
    content: { root: { children: [
      { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Heading' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Read ' }, { type: 'link', url: 'https://example.test', children: [{ type: 'text', text: 'this' }] }] },
      { type: 'upload', fields: { id: 88, filename: 'inline.webp', alt: 'A useful inline illustration', url: '/api/media/inline.webp' } },
    ] } },
    ...overrides,
  };
}

test('dry run converts only safe public posts, retains loader compatibility, and writes nothing', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'payload-export-'));
  try {
    const result = await exportPayloadPosts({ posts: [post()], groups, now, stagingDirectory: directory });
    assert.equal(result.report.dryRun, true);
    assert.equal(result.report.totals.exported, 1);
    assert.equal(result.report.validation.passed, true);
    assert.equal(await readFile(path.join(directory, 'alpha', 'exportable-post.md'), 'utf8').catch(() => ''), '');
    const markdown = result.files.get('alpha/exportable-post.md');
    assert.ok(markdown);
    assert.doesNotMatch(markdown, /\/api\/media\//);
    const staged = await mkdtemp(path.join(os.tmpdir(), 'markdown-loader-'));
    try {
      await exportPayloadPosts({ posts: [post()], groups, now, dryRun: false, stagingDirectory: staged });
      const loaded = loadMarkdownPosts({ contentDirectory: staged });
      assert.equal(loaded[0]?.slug, 'exportable-post');
      assert.deepEqual(selectPublicMarkdownPosts(loaded, now).map((item) => item.id), ['1']);
    } finally { await rm(staged, { recursive: true, force: true }); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('requires an explicit staging directory for writes', async () => {
  await assert.rejects(() => exportPayloadPosts({ posts: [post()], groups, now, dryRun: false }), /caller-selected stagingDirectory/);
  await assert.rejects(() => exportPayloadPosts({ posts: [post()], groups, now, dryRun: false, stagingDirectory: path.join(process.cwd(), 'content', 'posts') }), /never a staging target/);
});

test('paginates all Payload pages before inventorying', async () => {
  const requested: number[] = [];
  const docs = await collectPayloadPages(async (page) => {
    requested.push(page);
    return page === 1 ? { docs: ['one'], totalPages: 2 } : { docs: ['two'], totalPages: 2 };
  });
  assert.deepEqual(requested, [1, 2]);
  assert.deepEqual(docs, ['one', 'two']);
});

test('inventories every workflow status and blocks ambiguous scheduled posts while excluding drafts', async () => {
  const result = await exportPayloadPosts({ posts: [
    post({ id: 1, publish_status: 'draft' }),
    post({ id: 2, slug: 'ambiguous-scheduled', publish_status: 'scheduled', scheduledPublishDate: '2026-08-20T09:00:00Z' }),
    post({ id: 3, slug: 'future-scheduled', publish_status: 'scheduled', publishedDate: '2026-08-21T09:00:00Z', scheduledPublishDate: '2026-08-21T09:00:00Z' }),
    post({ id: 4, slug: 'sent-post', publish_status: 'sent' }),
  ], groups, now });
  assert.deepEqual(result.report.totals.byStatus, { draft: 1, scheduled: 2, sent: 1 });
  assert.equal(result.report.totals.exported, 2);
  assert.equal(result.report.totals.excluded, 1);
  assert.equal(result.report.totals.blocked, 1);
  assert.equal(result.report.totals.source, result.report.totals.exported + result.report.totals.excluded + result.report.totals.blocked);
});

test('reports duplicates, unsupported nodes, unresolved groups, invalid dates, and missing alt text without emitting files', async () => {
  const result = await exportPayloadPosts({ posts: [
    post(), post({ id: 1, slug: 'same-id' }), post({ id: 3, slug: 'exportable-post' }),
    post({ id: 4, slug: 'unknown-group', group: 'missing' }),
    post({ id: 5, slug: 'bad-date', publishedDate: '2026-08-20' }),
    post({ id: 6, slug: 'unsupported', content: { root: { children: [{ type: 'table' }] } } }),
    post({ id: 7, slug: 'bad-alt', meta: { image: { id: 9, filename: 'x.webp', alt: 'image' } } }),
  ], groups, now });
  assert.deepEqual(result.report.totals.duplicates.ids, ['1']);
  assert.deepEqual(result.report.totals.duplicates.slugs, ['exportable-post']);
  assert.equal(result.report.totals.unsupportedNodes, 1);
  assert.equal(result.report.totals.media.missingMeaningfulAlt, 1);
  assert.equal(result.report.totals.exported, 1);
  assert.equal(result.report.validation.passed, false);
  assert.equal(result.files.size, 1);
});

test('staged report contains safe source hashes and media identity but never raw Payload URLs or tokens', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'payload-report-'));
  try {
    await exportPayloadPosts({ posts: [post({ content: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'token=not-a-real-token' }] }] } } })], groups, now, dryRun: false, stagingDirectory: directory });
    const report = await readFile(path.join(directory, 'parity-report.json'), 'utf8');
    assert.match(report, /"rawSourceHashes"/);
    assert.match(report, /"payloadMediaId": "77"/);
    assert.doesNotMatch(report, /\/api\/media\//);
    assert.doesNotMatch(report, /not-a-real-token/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
