import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/(frontend)/api/subscribe/verify/route';
import { createVerificationToken, encryptSignupEmail, signupEmailDigest } from './writing-signup';

const names = ['RESEND_API_KEY', 'RESEND_TOPIC_FICTION_ID', 'WRITING_WELCOME_ENABLED', 'WELCOME_SERIES_ENABLED', 'SIGNUP_LINK_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]])); const oldFetch = globalThis.fetch;
afterEach(() => { for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]!; } globalThis.fetch = oldFetch; });

test('only explicit confirm writes a subscribed Resend contact and saves its ID without plaintext email', async () => {
  Object.assign(process.env, { RESEND_API_KEY: 'fixture-full-access', RESEND_TOPIC_FICTION_ID: 'topic-fiction', WRITING_WELCOME_ENABLED: 'false', WELCOME_SERIES_ENABLED: 'false', SIGNUP_LINK_SECRET: '0123456789abcdef0123456789abcdef', UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'fixture' });
  const challengeId = '0123456789abcdef0123456789abcdef'; const email = 'reader@example.test'; const now = Date.now();
  const challenge: Record<string, unknown> = { encryptedEmail: encryptSignupEmail(email), emailDigest: signupEmailDigest(email), audiences: ['fiction'], createdAt: now, status: 'pending' };
  const commands: unknown[][] = []; const resendCalls: Array<{ url: string; method: string; body?: unknown }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input); const method = init?.method ?? 'GET';
    if (url === 'https://redis.test') {
      const command = JSON.parse(String(init?.body)) as unknown[]; commands.push(command);
      if (command[0] === 'SET') return Response.json({ result: 'OK' });
      if (command[0] === 'GET' && command[1] === `writing:challenge:${challengeId}`) return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') {
        if (command[2] === 3) {
          for (const key of Object.keys(challenge)) delete (challenge as Record<string, unknown>)[key];
          Object.assign(challenge, JSON.parse(String(command[7])) as Record<string, unknown>);
        }
        return Response.json({ result: 'updated' });
      }
    }
    if (url.startsWith('https://api.resend.com')) {
      resendCalls.push({ url, method, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
      if (url.includes('/suppressions/')) return new Response('', { status: 404 });
      if (url.endsWith(`/contacts/${encodeURIComponent(email)}`)) return new Response('', { status: 404 });
      if (url.endsWith('/contacts')) return Response.json({ id: '550e8400-e29b-41d4-a716-446655440000', email, unsubscribed: false });
      if (url.endsWith('/topics')) return Response.json({ object: 'list' });
    }
    throw new Error(`Unexpected mocked request ${url}`);
  }) as typeof fetch;
  const response = await POST(new NextRequest('https://www.thearcades.me/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: createVerificationToken(challengeId, now + 60000), action: 'confirm' }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(resendCalls.map(({ method }) => method), ['GET', 'GET', 'POST', 'PATCH']);
  assert.deepEqual(resendCalls.at(-1)?.body, [{ id: 'topic-fiction', subscription: 'opt_in' }]);
  assert.equal(commands.some((command) => command[0] === 'EVAL'), true);
  assert.doesNotMatch(JSON.stringify(commands), /reader@example\.test/);
  assert.equal('encryptedEmail' in challenge, false);
  assert.equal(challenge.subscriberId, '550e8400-e29b-41d4-a716-446655440000');
});
