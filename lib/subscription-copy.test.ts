import assert from 'node:assert/strict';
import test from 'node:test';

import { endOfPieceCopy } from './subscription-copy';

const scope = "Join All Writing for stories, essays, and build notes when they're ready.";

test('active series keeps its supplied count and discloses All Writing without promising a next installment', () => {
  assert.equal(
    endOfPieceCopy({ kind: 'essay', seriesTitle: 'The Singularity Log', totalParts: 18, seriesActive: true }),
    `The Singularity Log currently has 18 installments. ${scope}`,
  );
  assert.equal(
    endOfPieceCopy({ kind: 'story', seriesTitle: 'A story', totalParts: 1, seriesActive: true }),
    `A story currently has 1 installment. ${scope}`,
  );
});

test('every standalone kind discloses the same All Writing scope and when-ready cadence', () => {
  for (const kind of ['story', 'essay', 'build note'] as const) {
    const copy = endOfPieceCopy({ kind });
    assert.equal(copy, scope);
    assert.doesNotMatch(copy, /next|as it arrives|as it lands/i);
  }
});

test('inactive or uncounted series do not promise series-only updates or an upcoming installment', () => {
  for (const input of [
    { kind: 'essay' as const, seriesTitle: 'A finished series', totalParts: 4 },
    { kind: 'essay' as const, seriesTitle: 'A series', seriesActive: true },
    { kind: 'story' as const, seriesTitle: 'A series', totalParts: 0, seriesActive: true },
  ]) assert.equal(endOfPieceCopy(input), scope);
});
