import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { GET } from '@/app/(frontend)/novels/it-takes-a-zoo/complete/pdf/route';
import assets from '@/data/zoo-collection-assets.json';
import { assertChapterOrder, validateHeinleinReleaseManifest } from './zoo-complete-edition-publisher';

test('the complete edition manifest describes the published PDF', async () => {
  assert.match(assets.completeEdition.url, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/collections\/it-takes-a-zoo\/complete\//);
  assert.match(assets.completeEdition.sha256, /^[a-f0-9]{64}$/);
  const pdf = await readFile(path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf'));
  assert.equal(pdf.byteLength, assets.completeEdition.bytes);
  assert.equal(createHash('sha256').update(pdf).digest('hex'), assets.completeEdition.sha256);
});

test('the publisher accepts only the canonical Heinlein release manifest', () => {
  const sourceSha256 = 'a'.repeat(64);
  assert.deepEqual(validateHeinleinReleaseManifest({
    title: 'It Takes a Zoo',
    author: 'Austen Tucker',
    generator: 'Heinlein',
    generatorVersion: '0.1.0',
    sourceSha256,
    chapters: [
      { order: 1, slug: 'cold-boot', title: 'Cold Boot' },
      { order: 2, slug: 'gallery-view', title: 'Gallery View' },
      { order: 3, slug: 'permissions', title: 'Permissions' },
      { order: 4, slug: 'goodgirl-tv', title: 'Goodgirl.tv' },
      { order: 5, slug: 'soft-reset', title: 'Soft Reset' },
      { order: 6, slug: 'open-port', title: 'Open Port' },
    ],
  }).sourceSha256, sourceSha256);
  assert.throws(() => validateHeinleinReleaseManifest({
    title: 'It Takes a Zoo', author: 'Austen Tucker', generator: 'Heinlein', generatorVersion: '0.1.0', sourceSha256,
    chapters: [{ order: 1, slug: 'cold-boot', title: 'Cold Boot' }],
  }), /canonical order/);
});

test('the publisher rejects a canonical contents page with misordered body chapters', () => {
  const chapters = [
    { order: 1, slug: 'cold-boot', title: 'Cold Boot' },
    { order: 2, slug: 'gallery-view', title: 'Gallery View' },
    { order: 3, slug: 'permissions', title: 'Permissions' },
    { order: 4, slug: 'goodgirl-tv', title: 'Goodgirl.tv' },
    { order: 5, slug: 'soft-reset', title: 'Soft Reset' },
    { order: 6, slug: 'open-port', title: 'Open Port' },
  ];
  const contents = chapters.map(({ title }) => title).join('\n');
  const misorderedBody = [...chapters.slice(0, 2), chapters[3], chapters[2], ...chapters.slice(4)]
    .map(({ title }) => title)
    .join('\n');
  assert.throws(() => assertChapterOrder(`${contents}\n${misorderedBody}`, chapters), /body chapter headings are not in canonical order/);
});

test('the complete edition attachment is cacheable, canonical, and noindex', async () => {
  const pdf = await readFile(path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf'));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), assets.completeEdition.url);
    return new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf' } });
  };

  try {
    const response = await GET(new Request('https://example.test/novels/it-takes-a-zoo/complete/pdf'));
    const etag = `"${assets.completeEdition.sha256}"`;
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="it-takes-a-zoo-complete.pdf"');
    assert.equal(response.headers.get('etag'), etag);
    assert.match(response.headers.get('link') ?? '', /<https:\/\/www\.thearcades\.me\/novels\/it-takes-a-zoo>; rel="canonical"/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.ok((await response.arrayBuffer()).byteLength > 0);

    const notModified = await GET(new Request('https://example.test/novels/it-takes-a-zoo/complete/pdf', { headers: { 'if-none-match': etag } }));
    assert.equal(notModified.status, 304);
    assert.equal(notModified.headers.get('etag'), etag);
    assert.equal(notModified.headers.get('x-robots-tag'), 'noindex');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
