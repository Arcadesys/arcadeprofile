import assert from 'node:assert/strict';
import test from 'node:test';

import { SCHEDULE, computeSchedule, slots, weekdayLabel } from './syncSchedule';

// 2026-05-13 is a Wednesday. Use noon local time to avoid TZ rollover.
const WED = new Date(2026, 4, 13, 12, 0, 0);

test('SCHEDULE assigns lanes Mon..Fri only', () => {
  assert.equal(SCHEDULE[0], 'fiction'); // Mon
  assert.equal(SCHEDULE[1], 'essays'); // Tue
  assert.equal(SCHEDULE[2], 'fiction'); // Wed
  assert.equal(SCHEDULE[3], 'essays'); // Thu
  assert.equal(SCHEDULE[4], 'fiction'); // Fri
  assert.equal(SCHEDULE[5], undefined);
  assert.equal(SCHEDULE[6], undefined);
});

test('slots() skips weekends and walks forward from Wed', () => {
  const it = slots(WED);
  const seen = [
    it.next().value!, // Wed (fiction)
    it.next().value!, // Thu (essays)
    it.next().value!, // Fri (fiction)
    it.next().value!, // Mon next week (fiction)
    it.next().value!, // Tue (essays)
  ];
  assert.deepEqual(seen.map((s) => s.lane), ['fiction', 'essays', 'fiction', 'fiction', 'essays']);
  assert.equal(seen[0]!.date.getDate(), 13);
  assert.equal(seen[1]!.date.getDate(), 14);
  assert.equal(seen[2]!.date.getDate(), 15);
  assert.equal(seen[3]!.date.getDate(), 18); // Mon
  assert.equal(seen[4]!.date.getDate(), 19); // Tue
});

test('computeSchedule on Wed: fiction[a,b] essays[c] → a Wed, b Fri, c Thu', () => {
  const map = computeSchedule(['a', 'b'], ['c'], WED);
  assert.equal(map.get('a')?.date, '2026-05-13');
  assert.equal(map.get('a')?.weekdayLabel, 'Wed · Fiction');
  assert.equal(map.get('b')?.date, '2026-05-15');
  assert.equal(map.get('b')?.weekdayLabel, 'Fri · Fiction');
  assert.equal(map.get('c')?.date, '2026-05-14');
  assert.equal(map.get('c')?.weekdayLabel, 'Thu · Essays');
});

test('computeSchedule rolls fiction over the weekend', () => {
  // Three fiction items from Wed: Wed, Fri, then Mon (skipping Sat/Sun).
  const map = computeSchedule(['a', 'b', 'c'], [], WED);
  assert.equal(map.get('c')?.date, '2026-05-18');
});

test('weekdayLabel formats Mon..Fri', () => {
  assert.equal(weekdayLabel(new Date(2026, 4, 18, 12, 0, 0), 'fiction'), 'Mon · Fiction');
  assert.equal(weekdayLabel(new Date(2026, 4, 19, 12, 0, 0), 'essays'), 'Tue · Essays');
  assert.equal(weekdayLabel(WED, 'fiction'), 'Wed · Fiction');
});
