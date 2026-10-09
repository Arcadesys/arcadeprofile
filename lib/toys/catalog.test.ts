import assert from 'node:assert/strict';
import test from 'node:test';

import { TOY_CATALOG } from '@/data/toys/catalog';

test('uses public Vercel Blob artwork for catalog cards', () => {
  for (const toy of TOY_CATALOG) {
    if (!toy.image) continue;

    assert.ok(
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(
        toy.image.src,
      ),
      `unsupported image source for ${toy.id}: ${toy.image.src}`,
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

test('every toy has a valid completion contract and next-toy recommendation', () => {
  const ids = new Set(TOY_CATALOG.map(({ id }) => id));

  for (const toy of TOY_CATALOG) {
    if (toy.completionMode === 'tabletop') {
      assert.equal(toy.outcomeCount, undefined);
      assert.equal(toy.nextToyId, undefined);
      continue;
    }
    assert.ok(toy.outcomeCount >= 1, `${toy.id} needs at least one outcome`);
    assert.ok(ids.has(toy.nextToyId), `${toy.id} has an unknown next toy`);
    assert.notEqual(toy.nextToyId, toy.id, `${toy.id} recommends itself`);
    if (toy.completionMode === 'linear') {
      assert.equal(toy.outcomeCount, 1);
    }
  }
});
