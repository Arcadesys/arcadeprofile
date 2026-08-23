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
