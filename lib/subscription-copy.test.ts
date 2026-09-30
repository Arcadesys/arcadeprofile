import assert from 'node:assert/strict';
import test from 'node:test';

import { endOfPieceCopy } from './subscription-copy';

test('active series copy uses the canonical series count', () => {
  assert.equal(
    endOfPieceCopy({
      kind: 'essay',
      seriesTitle: 'The Singularity Log',
      totalParts: 18,
      seriesActive: true,
    }),
    'The Singularity Log currently has 18 installments. Get the next one in your inbox as it lands.',
  );
});

test('standalone copy names the kind of work without inventing a series count', () => {
  assert.equal(endOfPieceCopy({ kind: 'story' }), 'Get the next story in your inbox as it arrives.');
  assert.equal(endOfPieceCopy({ kind: 'build note' }), 'Get the next build note in your inbox as it arrives.');
});

test('inactive series copy still names the series without implying it is active', () => {
  assert.equal(
    endOfPieceCopy({ kind: 'essay', seriesTitle: 'Queer Columns', totalParts: 4 }),
    'Follow Queer Columns for new essays.',
  );
});
