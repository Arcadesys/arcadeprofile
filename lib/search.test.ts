import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { buildPostUrl } from './blog';
import { buildSearchIndex, type SearchItem } from './search';
import { rankSearchItems } from './search-ranking';

const FIXTURES_DIRECTORY = path.join(process.cwd(), 'lib', 'fixtures', 'markdown-posts');

test('search index uses public posts and canonical essay URLs', async () => {
  const items = await buildSearchIndex({
    contentDirectory: FIXTURES_DIRECTORY,
    now: new Date('2026-08-22T00:00:00Z'),
    portfolioWorks: [],
  });

  assert.equal(items.some((item) => item.title === 'Future Beta Post'), false);
  assert.equal(items.find((item) => item.title === 'First Alpha Post')?.href, buildPostUrl('alpha', 'first'));
});

test('compact index supports title, excerpt, and body-term matching without serializing full bodies', async () => {
  const items = await buildSearchIndex({
    contentDirectory: FIXTURES_DIRECTORY,
    now: new Date('2026-08-22T00:00:00Z'),
    portfolioWorks: [],
  });

  assert.equal(rankSearchItems(items, 'First Alpha').some((item) => item.title === 'First Alpha Post'), true);
  assert.equal(rankSearchItems(items, 'concise').some((item) => item.title === 'First Alpha Post'), true);
  assert.equal(rankSearchItems(items, 'fixture').some((item) => item.title === 'First Alpha Post'), true);
  assert.equal(items.some((item) => item.searchText.includes('# First Alpha Post')), false);
});

test('ranking prefers title matches and caps results at eight', () => {
  const items: SearchItem[] = Array.from({ length: 12 }, (_, index) => ({
    title: index === 9 ? 'Fox' : `Item ${index}`,
    href: `/item-${index}`,
    kind: 'Page',
    preview: 'A fox result.',
    searchText: index === 9 ? 'Fox' : `Item ${index} fox`,
  }));

  const results = rankSearchItems(items, 'fox');
  assert.equal(results.length, 8);
  assert.equal(results[0]?.title, 'Fox');
});
