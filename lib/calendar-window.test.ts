import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCalendarWindow } from './calendar-window';

test('parseCalendarWindow returns an inclusive date range and exclusive end instant', () => {
  const result = parseCalendarWindow('2026-06-01', '2026-06-30');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.window, {
    start: '2026-06-01',
    end: '2026-06-30',
    endExclusiveIso: '2026-07-01T00:00:00.000Z',
  });
});

test('parseCalendarWindow accepts a single-day range', () => {
  const result = parseCalendarWindow('2026-06-19', '2026-06-19');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.window.endExclusiveIso, '2026-06-20T00:00:00.000Z');
});

test('parseCalendarWindow rejects missing, impossible, or reversed dates', () => {
  for (const [start, end, message] of [
    [null, '2026-06-19', /valid start and end/],
    ['2026-02-29', '2026-06-19', /valid start and end/],
    ['2026-06-20', '2026-06-19', /start must be on or before end/],
  ] as const) {
    const result = parseCalendarWindow(start, end);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, message);
  }
});
