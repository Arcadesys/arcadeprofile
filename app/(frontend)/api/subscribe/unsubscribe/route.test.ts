import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { POST } from './route';
import { createResendUnsubscribeToken } from '@/lib/writing-signup';

const oldSecret = process.env.SIGNUP_LINK_SECRET, oldKey = process.env.RESEND_API_KEY, oldFetch = globalThis.fetch;
const contact = '550e8400-e29b-41d4-a716-446655440000';
afterEach(() => { if (oldSecret === undefined) delete process.env.SIGNUP_LINK_SECRET; else process.env.SIGNUP_LINK_SECRET = oldSecret; if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey; globalThis.fetch = oldFetch; });

test('signed one-click unsubscribe marks the Resend contact globally unsubscribed', async () => {
  process.env.SIGNUP_LINK_SECRET = 'writing-unsubscribe-test-secret-with-at-least-32-chars'; process.env.RESEND_API_KEY = 'fixture-key';
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = (async (input, init) => { calls.push({ url: String(input), body: JSON.parse(String(init?.body)) }); return Response.json({ id: contact }); }) as typeof fetch;
  const token = createResendUnsubscribeToken(contact, 'a'.repeat(64));
  const response = await POST(new Request('https://www.thearcades.me/api/subscribe/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls, [{ url: `https://api.resend.com/contacts/${contact}`, body: { unsubscribed: true } }]);
});

test('GET is absent and unsigned tokens cause no provider update', async () => {
  process.env.SIGNUP_LINK_SECRET = 'writing-unsubscribe-test-secret-with-at-least-32-chars'; process.env.RESEND_API_KEY = 'fixture-key';
  let calls = 0; globalThis.fetch = (async () => { calls += 1; return Response.json({}); }) as typeof fetch;
  const response = await POST(new Request('https://www.thearcades.me/api/subscribe/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'invalid' }) }));
  assert.equal(response.status, 400); assert.equal(calls, 0);
});
