import assert from 'node:assert/strict';
import test from 'node:test';

import { comparePostsByGroupOrder, latestPostDateMs } from './post-order';

test('comparePostsByGroupOrder sorts explicit order first, then unordered posts by date', () => {
  const posts = [
    { order: null, date: '2026-01-03' },
    { order: 2, date: '2026-01-01' },
    { order: 1, date: '2026-01-02' },
    { date: '2026-01-01' },
  ];

  posts.sort(comparePostsByGroupOrder);

  assert.deepEqual(posts.map((p) => p.date), [
    '2026-01-02',
    '2026-01-01',
    '2026-01-01',
    '2026-01-03',
  ]);
});

test('latestPostDateMs returns the newest date regardless of group order', () => {
  const latest = latestPostDateMs([
    { order: 1, date: '2026-06-18' },
    { order: 2, date: '2026-05-01' },
  ]);

  assert.equal(latest, new Date('2026-06-18').getTime());
});
