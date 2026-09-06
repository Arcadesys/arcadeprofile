import assert from 'node:assert/strict';
import test from 'node:test';
import {
  migrateLegacyReadingProgress,
  nextPiece,
  parseReadingContinuity,
  recordForPiece,
  recommendedPieces,
  READING_CONTINUITY_MAX_AGE_MS,
  type ReadingPiece,
} from './reading-continuity';

const serial: ReadingPiece[] = [
  { canonicalPath: '/novel/one', title: 'One', contentType: 'chapter', collection: { id: 'novel', title: 'Novel', path: '/novel', position: 1, total: 2, status: 'active' } },
  { canonicalPath: '/novel/two', title: 'Two', contentType: 'chapter', collection: { id: 'novel', title: 'Novel', path: '/novel', position: 2, total: 2, status: 'active' } },
];

test('continuity record is versioned, piece-level, and rejects malformed or stale input', () => {
  const now = 1_000_000_000;
  const record = recordForPiece(serial[0]!, now);
  assert.deepEqual(parseReadingContinuity(JSON.stringify(record), now), record);
  assert.equal(parseReadingContinuity('{bad', now), null);
  assert.equal(parseReadingContinuity(JSON.stringify({ ...record, canonicalPath: 'https://elsewhere.test' }), now), null);
  assert.equal(parseReadingContinuity(JSON.stringify({ ...record, timestamp: now - READING_CONTINUITY_MAX_AGE_MS - 1 }), now), null);
});

test('legacy post progress migrates into the canonical versioned record', () => {
  const migrated = migrateLegacyReadingProgress(JSON.stringify({ groupSlug: 'essays', groupTitle: 'Essays', postSlug: 'hello', postTitle: 'Hello', partIndex: 2, totalParts: 3, visitedAt: 99 }), 100);
  assert.deepEqual(migrated, { version: 2, canonicalPath: '/projects/essays/hello', title: 'Hello', collection: { id: 'project:essays', title: 'Essays', path: '/projects/essays', position: 2, total: 3, status: 'complete' }, position: 2, timestamp: 99 });
  assert.equal(migrateLegacyReadingProgress(JSON.stringify({ groupSlug: 'essays' })), null);
  assert.equal(migrateLegacyReadingProgress(JSON.stringify({ groupSlug: '../unsafe', groupTitle: 'Essays', postSlug: 'hello', postTitle: 'Hello', partIndex: 1, totalParts: 1, visitedAt: 99 }), 100), null);
  assert.equal(migrateLegacyReadingProgress(JSON.stringify({ groupSlug: 'essays', groupTitle: 'Essays', postSlug: 'hello', postTitle: 'Hello', partIndex: 1, totalParts: 1, visitedAt: -999999999999 }), 100), null);
});

test('next only resolves an existing following piece and never invents an unwritten installment', () => {
  assert.equal(nextPiece(serial[0]!, serial)?.canonicalPath, '/novel/two');
  assert.equal(nextPiece(serial[1]!, serial), null);
  assert.equal(nextPiece({ ...serial[0]!, collection: { ...serial[0]!.collection!, total: 3 } }, serial), null);
});

test('recommendations prefer curated relationships, then shared tags, then recent same-type pieces without duplicate editions', () => {
  const current: ReadingPiece = { canonicalPath: '/fiction/current', title: 'Current', contentType: 'fiction', tags: ['fox'], curatedRelatedPaths: ['/fiction/curated'], editionOf: 'work-a' };
  const options: ReadingPiece[] = [
    current,
    { canonicalPath: '/fiction/curated', title: 'Curated', contentType: 'fiction', publishedAt: '2020-01-01' },
    { canonicalPath: '/fiction/tagged', title: 'Tagged', contentType: 'fiction', tags: ['fox'], publishedAt: '2024-01-01' },
    { canonicalPath: '/fiction/duplicate', title: 'Duplicate', contentType: 'fiction', editionOf: 'work-a', publishedAt: '2026-01-01' },
    { canonicalPath: '/fiction/recent', title: 'Recent', contentType: 'fiction', publishedAt: '2025-01-01' },
  ];
  assert.deepEqual(recommendedPieces(current, options).map((item) => item.canonicalPath), ['/fiction/curated', '/fiction/tagged']);
});

test('recommendations include at most one edition of any other work', () => {
  const current: ReadingPiece = { canonicalPath: '/fiction/current', title: 'Current', contentType: 'fiction', tags: ['fox'] };
  const options: ReadingPiece[] = [
    current,
    { canonicalPath: '/fiction/work-b-web', title: 'Work B', contentType: 'fiction', tags: ['fox'], editionOf: 'work-b', publishedAt: '2026-01-01' },
    { canonicalPath: '/fiction/work-b-reprint', title: 'Work B reprint', contentType: 'fiction', tags: ['fox'], editionOf: 'work-b', publishedAt: '2025-01-01' },
    { canonicalPath: '/fiction/work-c', title: 'Work C', contentType: 'fiction', tags: ['fox'], publishedAt: '2024-01-01' },
  ];
  assert.deepEqual(recommendedPieces(current, options).map((item) => item.canonicalPath), ['/fiction/work-b-web', '/fiction/work-c']);
});
