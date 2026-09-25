import assert from 'node:assert/strict';
import test from 'node:test';
import { getReadingCatalog } from './reading-catalog';
import { recommendedPieces } from './reading-continuity';

test('the unified catalog gives the final Zoo chapter cross-family recommendations and portfolio reading', async () => {
  const catalog = await getReadingCatalog();
  const finalZoo = catalog.find((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/failover')!;
  const portfolio = catalog.find((piece) => piece.canonicalPath === '/portfolio/gallery-view')!;
  assert.ok(finalZoo && portfolio);
  assert.deepEqual(recommendedPieces(finalZoo, catalog).map((piece) => piece.canonicalPath), ['/this-is-what-i-do-for-fun/carl', '/this-is-what-i-do-for-fun/cleanup-on-pod-six']);
  assert.equal(recommendedPieces(portfolio, catalog).length, 2);
});

test('the Gallery View duplicate edition is never recommended beside itself', async () => {
  const catalog = await getReadingCatalog();
  const portfolio = catalog.find((piece) => piece.canonicalPath === '/portfolio/gallery-view')!;
  assert.equal(recommendedPieces(portfolio, catalog).some((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/gallery-view'), false);
  assert.equal(recommendedPieces(portfolio, catalog).some((piece) => piece.editionOf === 'gallery-view'), false);
});
