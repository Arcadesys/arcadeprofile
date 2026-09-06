import assert from 'node:assert/strict';
import test from 'node:test';
import { getReadingCatalog } from './reading-catalog';
import { recommendedPieces } from './reading-continuity';

test('the unified catalog gives the final Zoo chapter cross-family recommendations and portfolio reading', async () => {
  const catalog = await getReadingCatalog();
  const finalZoo = catalog.find((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/open-port')!;
  const portfolio = catalog.find((piece) => piece.canonicalPath === '/portfolio/gallery-view')!;
  assert.ok(finalZoo && portfolio);
  assert.equal(recommendedPieces(finalZoo, catalog).length, 2);
  assert.equal(recommendedPieces(portfolio, catalog).length, 2);
});

test('the Gallery View duplicate edition is never recommended beside itself', async () => {
  const catalog = await getReadingCatalog();
  const portfolio = catalog.find((piece) => piece.canonicalPath === '/portfolio/gallery-view')!;
  assert.equal(recommendedPieces(portfolio, catalog).some((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/gallery-view'), false);
});
