import assert from 'node:assert/strict';
import test from 'node:test';

import { getPortfolioWork, PORTFOLIO_WORKS } from './portfolio';

function assertContentAddressedBlobUrl(raw: string) {
  const url = new URL(raw);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname.endsWith('.public.blob.vercel-storage.com'), true);
  // The sha256 segment is what makes the URL stable across re-runs.
  assert.match(url.pathname, /\/[a-f0-9]{64}\//);
}

test('portfolio holds only the works outside the collection', () => {
  // The other six moved to /this-is-what-i-do-for-fun; Gallery View is an
  // It Takes a Zoo chapter and stays here.
  assert.deepEqual(PORTFOLIO_WORKS.map((work) => work.title), ['Gallery View']);
});

test('every portfolio work has reader content and a blob-hosted PDF', () => {
  for (const work of PORTFOLIO_WORKS) {
    assert.equal(work.content.root.type, 'root');
    assert.ok(work.content.root.children.length > 0);
    assert.equal(getPortfolioWork(work.slug), work);
    assert.equal(work.titleImage.width, 1536);
    assert.equal(work.titleImage.height, 1024);
    assert.ok(work.titleImage.alt.includes(work.title));

    assertContentAddressedBlobUrl(work.titleImage.src);
    assertContentAddressedBlobUrl(work.downloads.pdf);
  }
});

test('portfolio offers no EPUB — that is the paid tier', () => {
  for (const work of PORTFOLIO_WORKS) {
    assert.deepEqual(Object.keys(work.downloads), ['pdf']);
  }
});
