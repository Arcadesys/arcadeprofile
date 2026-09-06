import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStaticSitemapEntries } from './sitemap';

test('the static sitemap includes the Zoo collection and all six chapters', () => {
  const entries = buildStaticSitemapEntries('https://example.test');
  assert.equal(
    entries.filter((entry) => entry.url.includes('/novels/it-takes-a-zoo')).length,
    7,
  );
});

test('the static sitemap includes the writing index', () => {
  const entries = buildStaticSitemapEntries('https://www.thearcades.me');
  assert.ok(entries.some((entry) => entry.url === 'https://www.thearcades.me/writing'));
});
