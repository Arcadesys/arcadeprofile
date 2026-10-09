import assert from 'node:assert/strict';
import test from 'node:test';
import { isAnalyticsSessionId, readAnalyticsSession, SESSION_IDLE_MS, SESSION_MAX_MS } from './analytics-session';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const time = 1_790_000_000_000;

test('UUIDv7 encodes creation time, persists version and refreshes last activity', () => {
  const saved = storage();
  const first = readAnalyticsSession(saved, 'session', undefined, time);
  assert.equal(first.rotated, true); assert.ok(isAnalyticsSessionId(first.session.id));
  assert.equal(Number.parseInt(first.session.id.replaceAll('-', '').slice(0, 12), 16), time);
  assert.equal(first.session.version, 2);
  const next = readAnalyticsSession(saved, 'session', undefined, time + 1000);
  assert.equal(next.rotated, false); assert.equal(next.session.id, first.session.id);
  assert.equal(next.session.startedAt, time); assert.equal(next.session.lastActivityAt, time + 1000);
});

test('idle boundary, maximum lifetime and backwards clock rotate instead of reusing stale sessions', () => {
  for (const elapsed of [SESSION_IDLE_MS, SESSION_MAX_MS, -1]) {
    const saved = storage();
    const first = readAnalyticsSession(saved, 'session', undefined, time).session;
    // Recent activity must not extend the absolute lifetime.
    if (elapsed === SESSION_MAX_MS) saved.setItem('session', JSON.stringify({ ...first, lastActivityAt: time + elapsed - 1 }));
    const next = readAnalyticsSession(saved, 'session', undefined, time + elapsed);
    assert.equal(next.rotated, true); assert.notEqual(next.session.id, first.id);
  }
});

test('legacy, corrupt, wrong-version and mismatched timestamp states migrate safely', () => {
  const saved = storage();
  const first = readAnalyticsSession(saved, 'session', undefined, time).session;
  for (const value of ['legacy-v4', '{', 'null', '[]', JSON.stringify({ ...first, version: 1 }), JSON.stringify({ ...first, startedAt: time - 1 }), JSON.stringify({ ...first, lastActivityAt: time + 9999 })]) {
    saved.setItem('session', value);
    const next = readAnalyticsSession(saved, 'session', undefined, time + 1);
    assert.equal(next.rotated, true); assert.ok(isAnalyticsSessionId(next.session.id));
  }
});

test('unavailable storage uses tab memory without creating an ID per event', () => {
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  const first = readAnalyticsSession(blocked, 'session', undefined, time).session;
  assert.equal(readAnalyticsSession(blocked, 'session', first, time + 1).session.id, first.id);
  assert.equal(readAnalyticsSession(null, 'session', first, time + 1).session.id, first.id);
  assert.notEqual(readAnalyticsSession(blocked, 'session', first, time + SESSION_IDLE_MS).session.id, first.id);
});
