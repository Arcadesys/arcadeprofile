import assert from 'node:assert/strict';
import test from 'node:test';
import { getReadingCatalog } from './reading-catalog';
import { recommendedPieces } from './reading-continuity';

test('the unified catalog gives the final Zoo chapter cross-family recommendations and portfolio reading', async () => {
  const catalog = await getReadingCatalog();
  const finalZoo = catalog.find((piece) => piece.canonicalPath === '/novels/it-takes-a-zoo/follower-count')!;
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

test('every piece family in the catalog carries whole-minute reading times', async () => {
  const catalog = await getReadingCatalog();
  const families = {
    project: catalog.filter((piece) => piece.canonicalPath.startsWith('/projects/')),
    collection: catalog.filter((piece) => piece.canonicalPath.startsWith('/this-is-what-i-do-for-fun/')),
    portfolio: catalog.filter((piece) => piece.canonicalPath.startsWith('/portfolio/')),
    zoo: catalog.filter((piece) => piece.canonicalPath.startsWith('/novels/it-takes-a-zoo/')),
  };
  for (const [family, pieces] of Object.entries(families)) {
    assert.ok(pieces.length > 0, family);
    for (const piece of pieces) assert.ok(Number.isInteger(piece.readingMinutes) && piece.readingMinutes! >= 1, `${family}: ${piece.canonicalPath}`);
  }
  const byPath = new Map(catalog.map((piece) => [piece.canonicalPath, piece.readingMinutes]));
  assert.equal(byPath.get('/novels/it-takes-a-zoo/cold-boot'), 30);
  assert.equal(byPath.get('/this-is-what-i-do-for-fun/carl'), 38);
});
