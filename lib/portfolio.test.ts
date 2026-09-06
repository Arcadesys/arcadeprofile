import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import path from 'node:path';

import { getPortfolioWork, PORTFOLIO_WORKS } from './portfolio';

function assertContentAddressedBlobUrl(raw: string) {
  const url = new URL(raw);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname.endsWith('.public.blob.vercel-storage.com'), true);
  // The sha256 segment is what makes the URL stable across re-runs.
  assert.match(url.pathname, /\/[a-f0-9]{64}\//);
}

test('portfolio holds only the works outside the collection', () => {
  // The other six moved to /this-is-what-i-do-for-fun. Gallery View has a
  // separately maintained portfolio edition and a novel chapter edition.
  assert.deepEqual(PORTFOLIO_WORKS.map((work) => work.title), ['Gallery View']);
});

test('Gallery View keeps distinct portfolio and novel editions crosslinked', () => {
  const portfolioPage = fs.readFileSync(path.join(process.cwd(), 'app/(frontend)/portfolio/[slug]/page.tsx'), 'utf8');
  const chapterPage = fs.readFileSync(path.join(process.cwd(), 'app/(frontend)/novels/it-takes-a-zoo/[chapter]/page.tsx'), 'utf8');
  const portfolioEdition = fs.readFileSync(path.join(process.cwd(), 'data/portfolio-content/gallery-view.md'), 'utf8');
  const novelEdition = fs.readFileSync(path.join(process.cwd(), 'content/novels/it-takes-a-zoo/gallery-view.md'), 'utf8');

  assert.notEqual(portfolioEdition, novelEdition);
  assert.match(portfolioPage, /distinct portfolio edition/);
  assert.match(portfolioPage, /\/novels\/it-takes-a-zoo\/gallery-view/);
  assert.match(chapterPage, /distinct portfolio edition/);
  assert.match(chapterPage, /\/portfolio\/gallery-view/);
});

test('every portfolio work has reader content and a blob-hosted PDF', () => {
  for (const work of PORTFOLIO_WORKS) {
    assert.ok(work.markdownBody.length > 100);
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
