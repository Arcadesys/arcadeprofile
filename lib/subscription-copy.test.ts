import assert from 'node:assert/strict';
import test from 'node:test';
import { endOfPieceCopy } from './subscription-copy';

const scope = "Join All Writing for stories and essays when they're ready.";

test('active series retains its count and discloses the actual All Writing signup scope', () => {
  assert.equal(endOfPieceCopy({ kind: 'essay', seriesTitle: 'The Singularity Log', totalParts: 18, seriesActive: true }), `The Singularity Log currently has 18 installments. ${scope}`);
  assert.equal(endOfPieceCopy({ kind: 'story', seriesTitle: 'A story', totalParts: 1, seriesActive: true }), `A story currently has 1 installment. ${scope}`);
});

test('all standalone work types state the same scope without promising the next installment', () => {
  for (const kind of ['story', 'essay', 'build note'] as const) {
    const copy = endOfPieceCopy({ kind });
    assert.equal(copy, scope);
    assert.doesNotMatch(copy, /next|as it arrives|as it lands/i);
  }
});

test('inactive and uncounted series never imply a series-only list or upcoming installment', () => {
  for (const input of [
    { kind: 'essay' as const, seriesTitle: 'A finished series', totalParts: 4 },
    { kind: 'essay' as const, seriesTitle: 'A series', seriesActive: true },
    { kind: 'story' as const, seriesTitle: 'A series', totalParts: 0, seriesActive: true },
  ]) assert.equal(endOfPieceCopy(input), scope);
});
