import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadingMeter, observeReading, sanitizeEngagement, type EngagementSnapshot } from './reading-engagement';

const reading = { visible: true, focused: true, inView: true, depth: 30 };
function harness() {
  let clock = 0;
  const sent: EngagementSnapshot[] = [];
  const meter = createReadingMeter(() => clock, value => sent.push(value));
  meter.sample(reading);
  return { meter, sent, tick: (state = reading, activity = false, ms = 1000) => { clock += ms; meter.sample(state, activity); } };
}

test('visible focused body time pauses on hidden, blur, offscreen and idle; activity resumes it', () => {
  const h = harness();
  for (let i = 0; i < 10; i++) h.tick();
  h.tick({ ...reading, visible: false }, false, 0);
  for (let i = 0; i < 10; i++) h.tick({ ...reading, visible: false });
  h.tick({ ...reading, focused: false }, false, 0);
  for (let i = 0; i < 10; i++) h.tick({ ...reading, focused: false });
  h.tick({ ...reading, inView: false }, false, 0);
  for (let i = 0; i < 10; i++) h.tick({ ...reading, inView: false });
  h.tick(reading, true, 0);
  for (let i = 0; i < 80; i++) h.tick();
  h.tick(reading, true, 0); h.tick();
  h.meter.finish();
  assert.equal(h.sent.at(-1)?.active_seconds, 71);
  assert.equal(h.sent.at(-1)?.depth_percent, 25);
});

test('no heartbeat: at most three cumulative milestones and one changed final per visit', () => {
  const h = harness();
  for (let i = 0; i < 310; i++) h.tick(reading, i % 30 === 0);
  h.meter.finish(); h.meter.finish(); h.tick(reading, true);
  assert.deepEqual(h.sent.map(value => value.engagement_checkpoint), ['30s', '120s', '300s', 'final']);
  assert.deepEqual(h.sent.map(value => value.active_seconds), [30, 120, 300, 310]);
  const again = harness(); again.tick(); again.meter.finish();
  assert.equal(again.sent[0].active_seconds, 1);
});

test('hidden scrolling never advances depth; final flush dedupes unchanged milestone', () => {
  const h = harness();
  for (let i = 0; i < 30; i++) h.tick();
  h.tick({ ...reading, visible: false, depth: 100 }, false, 0);
  h.meter.finish();
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].depth_percent, 25);
});

test('suspension/clock rollback are not active time; failures never throw; duration caps at 30 minutes', () => {
  const h = harness(); h.tick(reading, false, 60_000); h.tick(reading, false, -1000); h.meter.finish();
  assert.equal(h.sent.length, 0);
  const capped = harness();
  for (let i = 0; i < 2000; i++) capped.tick(reading, i % 30 === 0);
  capped.meter.finish(); assert.equal(capped.sent.at(-1)?.active_seconds, 1800);
  let now = 0; const broken = createReadingMeter(() => now, () => { throw new Error('blocked'); });
  broken.sample(reading); now = 1000;
  assert.doesNotThrow(() => broken.finish());
});

test('only bounded numeric metrics and fixed version/checkpoint survive', () => {
  const valid = { active_seconds: 30, depth_percent: 50, engagement_checkpoint: '30s', email: 'private@example.com', engagement_version: 'forged' };
  assert.deepEqual(sanitizeEngagement(valid), { active_seconds: 30, depth_percent: 50, engagement_checkpoint: '30s', engagement_version: 'visible_active_v1' });
  for (const patch of [{ active_seconds: 0 }, { active_seconds: 1801 }, { active_seconds: NaN }, { active_seconds: 1.5 }, { depth_percent: 99 }, { engagement_checkpoint: 'unknown' }, { engagement_checkpoint: {} }, { active_seconds: 20 }]) assert.equal(sanitizeEngagement({ ...valid, ...patch }), null);
});

test('DOM lifecycle handles visibility, form focus, pagehide/cleanup, BFCache and storage denial without noise', () => {
  let clock = 0;
  let interval: (() => void) | undefined;
  let cleared = 0;
  const sent: EngagementSnapshot[] = [];
  const win = Object.assign(new EventTarget(), { performance: { now: () => clock }, innerHeight: 500,
    setInterval: (callback: () => void) => { interval = callback; return 1; }, clearInterval: () => { cleared++; interval = undefined; } });
  Object.defineProperty(win, 'localStorage', { get: () => { throw new Error('blocked'); } });
  Object.defineProperty(win, 'sessionStorage', { get: () => { throw new Error('blocked'); } });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', hasFocus: () => true, activeElement: null as null | { tagName: string } });
  const stop = observeReading({ window: win as unknown as Window, document: doc as unknown as Document, bounds: () => ({ top: 0, bottom: 1000 }), send: value => sent.push(value) });
  const tick = (seconds: number) => { for (let i = 0; i < seconds; i++) { clock += 1000; interval?.(); } };
  tick(10);
  doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange')); tick(10);
  doc.visibilityState = 'visible'; doc.activeElement = { tagName: 'INPUT' }; doc.dispatchEvent(new Event('pointerdown')); tick(10);
  doc.activeElement = null; win.dispatchEvent(new Event('focus')); tick(5);
  win.dispatchEvent(new Event('pagehide')); tick(10);
  assert.equal(sent.length, 1); assert.equal(sent[0].active_seconds, 15);
  const restored = new Event('pageshow'); Object.defineProperty(restored, 'persisted', { value: true });
  win.dispatchEvent(restored); tick(2); stop(); stop();
  assert.equal(sent.length, 2); assert.equal(sent[1].active_seconds, 2); assert.equal(cleared, 1);
  tick(5); win.dispatchEvent(new Event('pagehide')); doc.dispatchEvent(new Event('keydown'));
  assert.equal(sent.length, 2);
});
