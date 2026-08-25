import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { GET } from '@/app/(frontend)/novels/it-takes-a-zoo/complete/pdf/route';
import assets from '@/data/zoo-collection-assets.json';
import { zooCompleteEditionHash, zooCompleteEditionSource } from './zoo-complete-edition';

test('the complete edition manifest describes the deterministic compiled PDF', async () => {
  assert.match(assets.completeEdition.url, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/collections\/it-takes-a-zoo\/complete\//);
  assert.match(assets.completeEdition.sha256, /^[a-f0-9]{64}$/);
  const pdf = await readFile(path.join(process.cwd(), 'public', 'editions', 'it-takes-a-zoo-complete.pdf'));
  assert.equal(pdf.byteLength, assets.completeEdition.bytes);
  assert.equal(createHash('sha256').update(pdf).digest('hex'), assets.completeEdition.sha256);
  assert.equal(zooCompleteEditionHash(), 'cb82dda29153521fcab21a751d86552dcbc93dd725ceba1a81363eb778aedac9');
  assert.match(zooCompleteEditionSource(), /"cold-boot"[\s\S]*"gallery-view"[\s\S]*"permissions"[\s\S]*"goodgirl-tv"[\s\S]*"soft-reset"[\s\S]*"open-port"/);
  assert.doesNotMatch(zooCompleteEditionSource(), /It takes a Zoo to raise a child,/);
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
