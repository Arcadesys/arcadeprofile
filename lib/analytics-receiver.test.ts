import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as posthog } from '../app/(frontend)/api/analytics/posthog/route';
import { POST as mff } from '../app/(frontend)/api/analytics/mff/route';
import { analyticsBrowser } from './fixtures/analytics-browser';

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
