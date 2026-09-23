import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { POST } from './route';
import { createKitUnsubscribeToken } from '@/lib/writing-signup';

const oldSecret = process.env.SIGNUP_LINK_SECRET;
const oldKey = process.env.KIT_API_KEY;
const oldFetch = globalThis.fetch;
afterEach(() => {
  if (oldSecret === undefined) delete process.env.SIGNUP_LINK_SECRET; else process.env.SIGNUP_LINK_SECRET = oldSecret;
  if (oldKey === undefined) delete process.env.KIT_API_KEY; else process.env.KIT_API_KEY = oldKey;
  globalThis.fetch = oldFetch;
});

test('explicit unsubscribe POST accepts only a signed token and calls Kit for its subscriber', async () => {
  process.env.SIGNUP_LINK_SECRET = 'writing-unsubscribe-test-secret-with-at-least-32-chars';
  process.env.KIT_API_KEY = 'kit-test';
  const calls: Array<{ url: string; body: string }> = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  const token = createKitUnsubscribeToken(789, 'a'.repeat(64));
  const response = await POST(new Request('https://thearcades.me/api/subscribe/unsubscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.kit.com/v4/subscribers/789/unsubscribe');
  assert.equal(calls[0].body, '{}');
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('RFC8058 one-click POST requires its one-click form field and signed query token', async () => {
  process.env.SIGNUP_LINK_SECRET = 'writing-unsubscribe-test-secret-with-at-least-32-chars';
  process.env.KIT_API_KEY = 'kit-test';
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return new Response(null, { status: 204 }); }) as typeof fetch;
  const token = createKitUnsubscribeToken(790, 'b'.repeat(64));
  const request = () => POST(new Request(`https://thearcades.me/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
  }));
  assert.equal((await request()).status, 200);
  assert.equal(calls, 1);
  const invalid = await POST(new Request(`https://thearcades.me/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=Something-Else',
  }));
  assert.equal(invalid.status, 400);
  assert.equal(calls, 1);
});

test('invalid signature never reaches Kit', async () => {
  process.env.SIGNUP_LINK_SECRET = 'writing-unsubscribe-test-secret-with-at-least-32-chars';
  process.env.KIT_API_KEY = 'kit-test';
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return Response.json({}); }) as typeof fetch;
  const response = await POST(new Request('https://thearcades.me/api/subscribe/unsubscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: `${createKitUnsubscribeToken(791, 'c'.repeat(64))}x` }),
  }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});
