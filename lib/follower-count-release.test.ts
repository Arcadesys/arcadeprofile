import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { GET } from '@/app/(frontend)/novels/it-takes-a-zoo/[chapter]/pdf/route';
import { getZooChapter } from './zoo-collection';

test('the chapter PDF route serves the exact edition from the current site origin', async () => {
  const chapter = getZooChapter('follower-count')!;
  const bytes = await readFile(`public${chapter.pdfUrl}`);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), `https://preview.example${chapter.pdfUrl}`);
    return new Response(bytes, { headers: { 'Content-Type': 'application/pdf' } });
  };
  try {
    const response = await GET(new Request('https://preview.example/novels/it-takes-a-zoo/follower-count/pdf'), { params: Promise.resolve({ chapter: 'follower-count' }) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition')!, /follower-count\.pdf/);
    assert.match(response.headers.get('link')!, /follower-count>; rel="canonical"/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
