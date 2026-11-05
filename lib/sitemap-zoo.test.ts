import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStaticSitemapEntries } from './sitemap';
import { ZOO_CHAPTERS } from './zoo-collection';

test('the static sitemap includes the Zoo collection and all published chapters', () => {
  const entries = buildStaticSitemapEntries('https://example.test');
  assert.equal(
    entries.filter((entry) => entry.url.includes('/novels/it-takes-a-zoo')).length,
    ZOO_CHAPTERS.length + 1,
  );
});

test('the static sitemap includes the writing index', () => {
  const entries = buildStaticSitemapEntries('https://www.thearcades.me');
  assert.ok(entries.some((entry) => entry.url === 'https://www.thearcades.me/writing'));
});
