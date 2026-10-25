import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as posthog } from '../app/(frontend)/api/analytics/posthog/route';
import { POST as mff } from '../app/(frontend)/api/analytics/mff/route';
import { analyticsBrowser } from './fixtures/analytics-browser';
import { captureSiteEvent } from './posthog-client';

const origin = 'https://www.thearcades.me';
const input = (path = '/stories') => ({ event: '$pageview', distinct_id: '9e833036-9f38-44d9-9d26-3d9c1b332f94', properties: { $current_url: `${origin}${path}?email=secret#token`, email: 'private@example.com', $set: { secret: true }, $raw_user_agent: 'forged', $geoip_disable: true } });
function request(body: unknown, url = `${origin}/api/analytics/posthog`, headers: Record<string, string> = {}) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin, 'user-agent': 'mock-browser', ...headers } });
}

test('both receiver boundaries sanitize before forwarding and preserve existing upstream policy/endpoints', async (t) => {
  analyticsBrowser(t);
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { sent.push({ url, body: JSON.parse(String(init.body)) }); return new Response('{}', { status: 200 }); });
  for (const [handler, path] of [[posthog, '/stories'], [mff, '/mff']] as const) {
    const response = await handler(request(input(path)));
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  }
  assert.match(sent[0].url, /\/capture\/$/); assert.match(sent[1].url, /\/i\/v0\/e\/$/);
  for (const { body } of sent) {
    const props = body.properties as Record<string, unknown>;
    assert.equal(props.email, undefined); assert.equal(props.$set, undefined); assert.equal(props.$raw_user_agent, 'mock-browser'); assert.equal(props.$process_person_profile, false);
    assert.ok(!JSON.stringify(body).includes('secret')); assert.ok(!JSON.stringify(body).includes('token'));
  }
  assert.equal((sent[0].body.properties as Record<string, unknown>).$geoip_disable, false);
  assert.equal((sent[1].body.properties as Record<string, unknown>).$geoip_disable, undefined);
});

test('preview/local/development requests are 204 no-ops even with forged production payload and headers', async (t) => {
  analyticsBrowser(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not send'); });
  for (const handler of [posthog, mff]) {
    for (const url of ['https://preview.vercel.app/api/analytics/posthog', 'http://localhost:3000/api/analytics/posthog']) assert.equal((await handler(request(input(), url, { 'x-forwarded-host': 'www.thearcades.me', host: 'www.thearcades.me' }))).status, 204);
    process.env.VERCEL_ENV = 'preview'; assert.equal((await handler(request(input()))).status, 204);
    process.env.VERCEL_ENV = 'production'; Object.assign(process.env, { NODE_ENV: 'development' }); assert.equal((await handler(request(input()))).status, 204);
    Object.assign(process.env, { NODE_ENV: 'production' });
  }
  assert.equal(fetch.mock.calls.length, 0);
});

test('invalid JSON/schema/event/host/private context is 400; cross-origin is 403; none reaches provider', async (t) => {
  analyticsBrowser(t);
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not send'); });
  for (const handler of [posthog, mff]) {
    assert.equal((await handler(new NextRequest(`${origin}/api/analytics/posthog`, { method: 'POST', body: '{' }))).status, 400);
    for (const value of [null, [], 'secret', {}, { ...input(), event: 'unknown' }, { ...input(), distinct_id: 'email@example.com' }, input('/subscribe/verify'), input('/projects/unknown/future'), { ...input(), properties: { $current_url: 'https://preview.vercel.app/mff' } }]) assert.equal((await handler(request(value))).status, 400);
    assert.equal((await handler(request(input(), undefined, { origin: 'https://evil.test' }))).status, 403);
  }
  assert.equal(fetch.mock.calls.length, 0);
});

test('upstream rejection and network failure return 502 without logging payloads or retrying', async (t) => {
  analyticsBrowser(t);
  const logs: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => { logs.push(args); });
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 429 }));
  assert.equal((await posthog(request(input()))).status, 502);
  fetch.mock.mockImplementation(async () => { throw new Error('private upstream text'); });
  const response = await mff(request(input('/mff')));
  assert.equal(response.status, 502); assert.equal((await response.json()).error, 'upstream_failed');
  assert.equal(fetch.mock.calls.length, 2);
  assert.ok(!JSON.stringify(logs).includes('private')); assert.ok(!JSON.stringify(logs).includes('secret'));
});

test('receiver maps coarse native device/source, preserves receipt tuple, and coalesces duplicates', async (t) => {
  analyticsBrowser(t);
  const sent: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(JSON.parse(String(init?.body))); return new Response('{}'); });
  const receipt = { ...input(), uuid: crypto.randomUUID(), timestamp: new Date().toISOString(), properties: {
    ...input().properties, $device_type: 'forged', $referrer: 'https://www.google.com/search?q=private', $referring_domain: 'forged', utm_source: 'NEWS', $set_once: { email: 'private' },
  } };
  const headers = { 'user-agent': 'Mozilla iPhone Mobile' };
  const results = await Promise.all([posthog(request(receipt, undefined, headers)), posthog(request(receipt, undefined, headers))]);
  assert.ok(results.every(response => response.status === 200));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].uuid, receipt.uuid); assert.equal(sent[0].timestamp, receipt.timestamp);
  const properties = sent[0].properties as Record<string, unknown>;
  assert.equal(properties.$device_type, 'Mobile'); assert.equal(properties.$referring_domain, 'www.google.com');
  assert.equal(properties.$referrer, 'https://www.google.com'); assert.equal(properties.utm_source, 'news'); assert.equal(properties.$set_once, undefined);
  assert.equal((await posthog(request(receipt, undefined, headers))).status, 200); assert.equal(sent.length, 1);
  assert.equal((await posthog(request({ ...receipt, timestamp: new Date(Date.parse(receipt.timestamp) - 1).toISOString() }, undefined, headers))).status, 400);
  assert.equal(sent.length, 1);
  assert.equal((await posthog(request({ ...receipt, uuid: crypto.randomUUID() }, undefined, { dnt: '1' }))).status, 204);
  assert.equal(sent.length, 1);
});

test('public reader PDF intent survives capture, client preparation, and receiver sanitization without its route', async (t) => {
  const path = '/novels/it-takes-a-zoo/cold-boot';
  analyticsBrowser(t, path);
  const requestBodies: Record<string, unknown>[] = [];
  const forwarded: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (String(url).startsWith('/api/')) {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      requestBodies.push(body);
      return posthog(request(body));
    }
    forwarded.push(JSON.parse(String(init.body)) as Record<string, unknown>);
    return new Response('{}', { status: 200 });
  });

  captureSiteEvent('site link clicked', { href: `${path}/pdf?private=secret#fragment` });
  for (let i = 0; i < 100; i++) await Promise.resolve();

  assert.equal(requestBodies.length, 1);
  assert.equal(forwarded.length, 1);
  for (const body of [...requestBodies, ...forwarded]) {
    const properties = body.properties as Record<string, unknown>;
    assert.equal(properties.destination_kind, 'public_pdf');
    assert.equal(properties.conversion_stage, 'public_pdf_download_intent');
    assert.equal(properties.href, undefined);
    assert.equal(properties.pathname, path);
    assert.ok(!JSON.stringify(body).includes('/pdf'));
    assert.ok(!JSON.stringify(body).includes('secret'));
    assert.ok(!JSON.stringify(body).includes('fragment'));
  }
});

test('lost browser acknowledgments retry the same CTA UUID/timestamp and forward only once within the receiver window', async (t) => {
  analyticsBrowser(t, '/');
  let timerId = 0;
  const timers = new Map<number, { fn: () => void; delay: number }>();
  t.mock.method(window, 'setTimeout', (fn: () => void, delay: number) => { timers.set(++timerId, { fn, delay }); return timerId; });
  t.mock.method(window, 'clearTimeout', (id: number) => { timers.delete(id); });
  const attempts: string[] = []; const forwarded: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (String(url).startsWith('/api/')) {
      attempts.push(String(init?.body));
      const response = await posthog(request(JSON.parse(String(init?.body))));
      if (attempts.length < 3) throw new Error('acknowledgment lost after provider accepted');
      return response;
    }
    assert.match(String(url), /^https:\/\/us\.i\.posthog\.com\/capture\//);
    forwarded.push(JSON.parse(String(init?.body))); return new Response('{}');
  });
  captureSiteEvent('site link clicked', { href: 'https://www.amazon.com/dp/B0HM8J2Z87?private#token', placement: 'home_hero', destination_kind: 'amazon_kindle' });
  for (let step = 0; step < 3; step++) {
    for (let i = 0; i < 50; i++) await Promise.resolve();
    const retry = [...timers.values()].find(timer => timer.delay < 5000);
    if (retry) retry.fn();
  }
  for (let i = 0; i < 50; i++) await Promise.resolve();
  assert.equal(attempts.length, 3); assert.equal(new Set(attempts).size, 1);
  assert.equal(forwarded.length, 1);
  const receipt = JSON.parse(attempts[0]);
  assert.equal(forwarded[0].uuid, receipt.uuid); assert.equal(forwarded[0].timestamp, receipt.timestamp);
  assert.equal(receipt.properties.placement, 'home_hero'); assert.equal(receipt.properties.destination_kind, 'amazon_kindle');
  assert.ok(!attempts[0].includes('private')); assert.ok(!attempts[0].includes('B0HM8J2Z87'));
  assert.equal(timers.size, 0);
});
