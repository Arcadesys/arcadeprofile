import assert from 'node:assert/strict';
import test from 'node:test';

import { TOY_CATALOG } from '@/data/toys/catalog';

test('uses public Vercel Blob artwork for every catalog card', () => {
  for (const toy of TOY_CATALOG) {
    assert.match(
      toy.image.src,
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//,
    );
  }
});
