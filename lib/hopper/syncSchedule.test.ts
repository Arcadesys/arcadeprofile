import assert from 'node:assert/strict';
import test from 'node:test';

import type { Post } from '@/payload-types';

import {
  SCHEDULE,
  computeSchedule,
  scheduledPublishDateForSlot,
  slots,
  syncQueueToPosts,
  todayInSiteTz,
  weekdayLabel,
} from './syncSchedule';

// 2026-05-13 is a Wednesday in America/New_York. Anchor at 16:00 UTC
// (noon Eastern daylight time) so the date is unambiguous regardless of
// the machine running the test.
const WED = new Date(Date.UTC(2026, 4, 13, 16, 0, 0));
const TZ = 'America/New_York';

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
  const it = slots(WED, TZ);
  const seen = [
    it.next().value!,
    it.next().value!,
    it.next().value!,
    it.next().value!,
    it.next().value!,
  ];
  assert.deepEqual(seen.map((s) => s.lane), ['fiction', 'essays', 'fiction', 'fiction', 'essays']);
  assert.equal(seen[0]!.date.getDate(), 13);
  assert.equal(seen[1]!.date.getDate(), 14);
  assert.equal(seen[2]!.date.getDate(), 15);
  assert.equal(seen[3]!.date.getDate(), 18);
  assert.equal(seen[4]!.date.getDate(), 19);
});

test('computeSchedule on Wed: fiction[a,b] essays[c] → a Wed, b Fri, c Thu', () => {
  const map = computeSchedule(['a', 'b'], ['c'], WED, TZ);
  assert.equal(map.get('a')?.date, '2026-05-13');
  assert.equal(map.get('a')?.scheduledPublishDate, '2026-05-13T14:00:00.000Z');
  assert.equal(map.get('a')?.weekdayLabel, 'Wed · Fiction');
  assert.equal(map.get('b')?.date, '2026-05-15');
  assert.equal(map.get('b')?.weekdayLabel, 'Fri · Fiction');
  assert.equal(map.get('c')?.date, '2026-05-14');
  assert.equal(map.get('c')?.weekdayLabel, 'Thu · Essays');
});

test('scheduledPublishDateForSlot uses the queue default publish hour', () => {
  assert.equal(scheduledPublishDateForSlot('2026-05-13'), '2026-05-13T14:00:00.000Z');
});

test('computeSchedule can skip slots whose publish time has already passed', () => {
  const map = computeSchedule(['a'], [], WED, TZ, undefined, { includePastSlots: false });
  assert.equal(map.get('a')?.date, '2026-05-15');
  assert.equal(map.get('a')?.scheduledPublishDate, '2026-05-15T14:00:00.000Z');
});

test('computeSchedule rolls fiction over the weekend', () => {
  const map = computeSchedule(['a', 'b', 'c'], [], WED, TZ);
  assert.equal(map.get('c')?.date, '2026-05-18');
});

test('weekdayLabel formats Mon..Fri in site TZ', () => {
  assert.equal(weekdayLabel(new Date(Date.UTC(2026, 4, 18, 16, 0, 0)), 'fiction', TZ), 'Mon · Fiction');
  assert.equal(weekdayLabel(new Date(Date.UTC(2026, 4, 19, 16, 0, 0)), 'essays', TZ), 'Tue · Essays');
  assert.equal(weekdayLabel(WED, 'fiction', TZ), 'Wed · Fiction');
});

test('computeSchedule labels match site TZ even when host TZ differs', () => {
  const prev = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const map = computeSchedule(['a', 'b'], ['c'], WED, TZ);
    assert.equal(map.get('a')?.date, '2026-05-13');
    assert.equal(map.get('a')?.weekdayLabel, 'Wed · Fiction');
    assert.equal(map.get('b')?.date, '2026-05-15');
    assert.equal(map.get('b')?.weekdayLabel, 'Fri · Fiction');
    assert.equal(map.get('c')?.date, '2026-05-14');
    assert.equal(map.get('c')?.weekdayLabel, 'Thu · Essays');
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
});

test('todayInSiteTz returns the calendar date in the configured TZ', () => {
  // 03:00 UTC on May 14 = 23:00 ET on May 13 (EDT, UTC-4). Should report 2026-05-13.
  const lateUtc = new Date(Date.UTC(2026, 4, 14, 3, 0, 0));
  assert.equal(todayInSiteTz(lateUtc, TZ), '2026-05-13');
  // 16:00 UTC on May 13 = 12:00 ET. Same day.
  assert.equal(todayInSiteTz(WED, TZ), '2026-05-13');
});

test('computeSchedule skips taken dates and cascades the lane forward', () => {
  const map = computeSchedule(['a', 'b'], [], WED, TZ, new Set(['2026-05-13']));
  // Wed (2026-05-13) is taken → 'a' shifts to next fiction slot (Fri),
  // 'b' shifts to the Mon after that.
  assert.equal(map.get('a')?.date, '2026-05-15');
  assert.equal(map.get('a')?.weekdayLabel, 'Fri · Fiction');
  assert.equal(map.get('b')?.date, '2026-05-18');
  assert.equal(map.get('b')?.weekdayLabel, 'Mon · Fiction');
});

test('computeSchedule taken-date in one lane does not affect the other', () => {
  // Wed (2026-05-13) is a fiction day; blocking it should leave essays untouched.
  const map = computeSchedule([], ['c', 'd'], WED, TZ, new Set(['2026-05-13']));
  assert.equal(map.get('c')?.date, '2026-05-14'); // Thu
  assert.equal(map.get('d')?.date, '2026-05-19'); // next Tue
});

test('computeSchedule cascades across multiple taken dates', () => {
  const map = computeSchedule(['a'], [], WED, TZ, new Set(['2026-05-13', '2026-05-15']));
  // Both Wed and Fri are blocked → first fiction slot is the following Mon.
  assert.equal(map.get('a')?.date, '2026-05-18');
  assert.equal(map.get('a')?.weekdayLabel, 'Mon · Fiction');
});

test('computeSchedule with empty takenDates matches the unguarded behavior', () => {
  const guarded = computeSchedule(['a', 'b'], ['c'], WED, TZ, new Set<string>());
  const baseline = computeSchedule(['a', 'b'], ['c'], WED, TZ);
  assert.deepEqual(guarded.get('a'), baseline.get('a'));
  assert.deepEqual(guarded.get('b'), baseline.get('b'));
  assert.deepEqual(guarded.get('c'), baseline.get('c'));
});

test('syncQueueToPosts writes full scheduled datetimes and skips past slots by default', async () => {
  const updates: Array<{ id: string | number; data: Record<string, unknown>; context?: unknown }> = [];
  const docs: Array<Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate'>> = [
    { id: 1, publish_status: 'draft', scheduledPublishDate: null },
    { id: 2, publish_status: 'draft', scheduledPublishDate: null },
  ];
  const payload = {
    find: async () => paginated(docs),
    update: async (args: { id: string | number; data: Record<string, unknown>; context?: unknown }) => {
      updates.push(args);
      return args;
    },
  };

  await syncQueueToPosts(
    payload,
    { fictionIds: [], essaysIds: [] },
    { fictionIds: ['1', '2'], essaysIds: [] },
    WED,
    undefined,
    { includePastSlots: false },
  );

  assert.equal(updates.length, 2);
  assert.equal(updates[0]!.data.scheduledPublishDate, '2026-05-15T14:00:00.000Z');
  assert.equal(updates[1]!.data.scheduledPublishDate, '2026-05-18T14:00:00.000Z');
  assert.equal(updates[0]!.context, undefined);
});

test('syncQueueToPosts rewrites matching dates with the wrong scheduled instant', async () => {
  const updates: Array<{ id: string | number; data: Record<string, unknown>; context?: unknown }> = [];
  const docs: Array<Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate'>> = [
    { id: 1, publish_status: 'scheduled', scheduledPublishDate: '2026-05-15' },
  ];
  const payload = {
    find: async () => paginated(docs),
    update: async (args: { id: string | number; data: Record<string, unknown>; context?: unknown }) => {
      updates.push(args);
      return args;
    },
  };

  await syncQueueToPosts(
    payload,
    { fictionIds: [], essaysIds: [] },
    { fictionIds: ['1'], essaysIds: [] },
    WED,
    undefined,
    { includePastSlots: false },
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0]!.data.scheduledPublishDate, '2026-05-15T14:00:00.000Z');
});

test('syncQueueToPosts no-ops when stored scheduled instant already matches', async () => {
  const updates: Array<{ id: string | number; data: Record<string, unknown>; context?: unknown }> = [];
  const docs: Array<Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate'>> = [
    { id: 1, publish_status: 'scheduled', scheduledPublishDate: '2026-05-15T14:00:00Z' },
  ];
  const payload = {
    find: async () => paginated(docs),
    update: async (args: { id: string | number; data: Record<string, unknown>; context?: unknown }) => {
      updates.push(args);
      return args;
    },
  };

  await syncQueueToPosts(
    payload,
    { fictionIds: [], essaysIds: [] },
    { fictionIds: ['1'], essaysIds: [] },
    WED,
    undefined,
    { includePastSlots: false },
  );

  assert.equal(updates.length, 0);
});

test('syncQueueToPosts can include due slots for cron self-heal with validation context', async () => {
  const updates: Array<{ id: string | number; data: Record<string, unknown>; context?: unknown }> = [];
  const docs: Array<Pick<Post, 'id' | 'publish_status' | 'scheduledPublishDate'>> = [
    { id: 1, publish_status: 'draft', scheduledPublishDate: null },
  ];
  const payload = {
    find: async () => paginated(docs),
    update: async (args: { id: string | number; data: Record<string, unknown>; context?: unknown }) => {
      updates.push(args);
      return args;
    },
  };

  await syncQueueToPosts(
    payload,
    { fictionIds: [], essaysIds: [] },
    { fictionIds: ['1'], essaysIds: [] },
    WED,
    undefined,
    { includePastSlots: true, allowPastScheduledPublishDate: true },
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0]!.data.scheduledPublishDate, '2026-05-13T14:00:00.000Z');
  assert.deepEqual(updates[0]!.context, { allowPastScheduledPublishDate: true });
});

function paginated<T>(docs: T[]) {
  return {
    docs,
    totalDocs: docs.length,
    limit: docs.length,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };
}
