import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGroupSceneOrderUpdates } from './group-scenes-order';

test('resolveGroupSceneOrderUpdates writes group-global order across chapter columns', () => {
  const updates = resolveGroupSceneOrderUpdates(
    [
      { chapterSlug: 'first', postIds: ['10', '11'] },
      { chapterSlug: 'second', postIds: ['12'] },
      { chapterSlug: null, postIds: ['13'] },
    ],
    [
      { id: 10, chapter: null, order: 0 },
      { id: 11, chapter: null, order: 0 },
      { id: 12, chapter: null, order: 0 },
      { id: 13, chapter: null, order: 0 },
    ],
  );

  assert.deepEqual(updates, [
    { id: '10', chapter: 'first', order: 0 },
    { id: '11', chapter: 'first', order: 1 },
    { id: '12', chapter: 'second', order: 2 },
    { id: '13', chapter: null, order: 3 },
  ]);
});

test('resolveGroupSceneOrderUpdates skips rows whose chapter and global order already match', () => {
  const updates = resolveGroupSceneOrderUpdates(
    [
      { chapterSlug: 'first', postIds: ['10', '11'] },
      { chapterSlug: 'second', postIds: ['12'] },
    ],
    [
      { id: 10, chapter: 'first', order: 0 },
      { id: 11, chapter: 'first', order: 1 },
      { id: 12, chapter: 'old', order: 2 },
    ],
  );

  assert.deepEqual(updates, [{ id: '12', chapter: 'second', order: 2 }]);
});
