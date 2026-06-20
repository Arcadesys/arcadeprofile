import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isIsoDateOnly,
  isoDateOnlyToScheduledIso,
  isoDateOnlyToUtcDate,
  parseIsoDateOnly,
} from './iso-date';

test('parseIsoDateOnly accepts real calendar dates', () => {
  assert.deepEqual(parseIsoDateOnly('2026-02-28'), { year: 2026, month: 2, day: 28 });
  assert.deepEqual(parseIsoDateOnly('2028-02-29'), { year: 2028, month: 2, day: 29 });
});

test('parseIsoDateOnly rejects impossible or loose dates', () => {
  assert.equal(parseIsoDateOnly('2026-02-29'), null);
  assert.equal(parseIsoDateOnly('2026-13-01'), null);
  assert.equal(parseIsoDateOnly('2026-00-10'), null);
  assert.equal(parseIsoDateOnly('2026-01-00'), null);
  assert.equal(parseIsoDateOnly('2026-1-1'), null);
  assert.equal(parseIsoDateOnly('2026-01-01T00:00:00Z'), null);
});

test('isIsoDateOnly narrows valid date-only strings', () => {
  assert.equal(isIsoDateOnly('2026-06-19'), true);
  assert.equal(isIsoDateOnly('2026-99-99'), false);
  assert.equal(isIsoDateOnly(null), false);
});

test('isoDateOnlyToUtcDate returns midnight UTC for valid dates', () => {
  assert.equal(isoDateOnlyToUtcDate('2026-06-19')?.toISOString(), '2026-06-19T00:00:00.000Z');
  assert.equal(isoDateOnlyToUtcDate('2026-99-99'), null);
});

test('isoDateOnlyToScheduledIso preserves requested UTC time', () => {
  assert.equal(
    isoDateOnlyToScheduledIso('2026-06-19', 14, 30, 15, 250),
    '2026-06-19T14:30:15.250Z',
  );
  assert.equal(isoDateOnlyToScheduledIso('2026-99-99', 14), null);
});
