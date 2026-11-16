import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalyticsTransport } from './analytics-transport';
import { createReceiptCache } from './analytics-receipts';
import { analyticsDeviceType } from './analytics-device';

const settled = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('transient/network delivery retries keep the exact body, are bounded, and pagehide flush never duplicates in-flight work', async () => {
  let index = 0;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const schedule = (callback: () => void, delay: number) => { timers.set(++index, { callback, delay }); return index; };
  const sent: RequestInit[] = [];
  let resolve: (response: Response) => void = () => {};
  const transport = createAnalyticsTransport({ schedule, cancel: id => { timers.delete(id); }, allowed: () => true,
    fetch: async (_url, init) => { sent.push(init!); if (sent.length === 1) return new Promise<Response>(done => { resolve = done; }); throw new Error('transient'); },
  });
  const body = JSON.stringify({ uuid: 'stable', timestamp: 'original', event: 'click intent' });
  transport.send('/local', body);
  transport.flush(); transport.flush();
  assert.equal(sent.length, 1);
  resolve(new Response(null, { status: 502 })); await settled();
  transport.flush(); await settled();
  const retry = [...timers.values()].find(timer => timer.delay === 1000);
  assert.ok(retry); retry.callback(); await settled();
  transport.flush(); await settled();
  assert.equal(sent.length, 3);
  assert.ok(sent.every(request => request.body === body && request.keepalive === true));
  assert.equal(timers.size, 0);
});

test('success/permanent rejection never retries, and a revoked permission drops queued retries', async () => {
  const timers = new Map<number, () => void>(); let index = 0; let status = 204; let allowed = true; let calls = 0;
  const transport = createAnalyticsTransport({ schedule: fn => { timers.set(++index, fn); return index; }, cancel: id => { timers.delete(id); }, allowed: () => allowed,
    fetch: async () => { calls++; return new Response(null, { status }); },
  });
  for (status of [204, 400, 403]) { transport.send('/local', 'safe'); await settled(); transport.flush(); }
  assert.equal(calls, 3); assert.equal(timers.size, 0);
  status = 429; transport.send('/local', 'safe'); await settled();
  allowed = false; transport.flush(); await settled();
  assert.equal(calls, 4); assert.equal(timers.size, 0);
});

test('receiver coalesces concurrent/successful receipts, rejects UUID mutation, and expires bounded state', async () => {
  let now = 0; const receipt = createReceiptCache<boolean>(() => now); let forwards = 0;
  let resolve: (result: boolean) => void = () => {};
  const forward = async () => { forwards++; return new Promise<boolean>(done => { resolve = done; }); };
  const first = receipt('id', 'hash', forward, Boolean);
  const second = receipt('id', 'hash', forward, Boolean);
  assert.equal(await receipt('id', 'different', forward, Boolean), null);
  assert.equal(forwards, 1); resolve(true); assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(await receipt('id', 'hash', forward, Boolean), true); assert.equal(forwards, 1);
  now = 120_001;
  assert.equal(await receipt('id', 'hash', async () => { forwards++; return false; }, Boolean), false);
  assert.equal(await receipt('id', 'hash', async () => { forwards++; return true; }, Boolean), true);
  assert.equal(forwards, 3);
});

test('coarse native device inference leaves bots, missing and ambiguous agents unknown', () => {
  for (const ua of [null, '', 'unrecognized', 'Googlebot Android Mobile', 'HeadlessChrome Macintosh', 'x'.repeat(4097)]) assert.equal(analyticsDeviceType(ua), undefined);
  assert.equal(analyticsDeviceType('Mozilla Windows NT 10.0'), 'Desktop');
  assert.equal(analyticsDeviceType('Mozilla Macintosh Intel Mac OS X'), 'Desktop');
  assert.equal(analyticsDeviceType('Mozilla iPhone Mobile'), 'Mobile');
  assert.equal(analyticsDeviceType('Mozilla Android Mobile'), 'Mobile');
  assert.equal(analyticsDeviceType('Mozilla iPad'), 'Tablet');
  assert.equal(analyticsDeviceType('Mozilla Android Tablet'), 'Tablet');
});
