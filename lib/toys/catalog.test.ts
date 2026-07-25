import assert from 'node:assert/strict';
import test from 'node:test';

import { TOY_CATALOG } from '@/data/toys/catalog';

test('uses public Vercel Blob artwork for every catalog card that has art', () => {
  for (const toy of TOY_CATALOG) {
    if (!toy.image) continue;

    assert.match(
      toy.image.src,
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//,
    );
  }
});

test('every toy has a unique id and a matching /toys route', () => {
  const ids = new Set<string>();

  for (const toy of TOY_CATALOG) {
    assert.ok(!ids.has(toy.id), `duplicate toy id: ${toy.id}`);
    ids.add(toy.id);
    assert.equal(toy.href, `/toys/${toy.id}`);
  }
});
