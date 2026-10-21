import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/(frontend)/api/subscribe/route';

const names = ['RESEND_API_KEY','RESEND_SEND_API_KEY','RESEND_FROM_EMAIL','RESEND_FROM_NAME','MAIL_PROVIDER','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','SIGNUP_LINK_SECRET'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]])); const oldFetch = globalThis.fetch;
afterEach(() => { for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]!; } globalThis.fetch = oldFetch; });

test('signup request only reads Resend state and sends one first-party verification email', async () => {
  Object.assign(process.env, { RESEND_API_KEY: 'fixture', RESEND_SEND_API_KEY: 'fixture-send-only', RESEND_FROM_EMAIL: 'austen@mail.thearcades.me', RESEND_FROM_NAME: 'Austen', MAIL_PROVIDER: 'resend', UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'fixture', SIGNUP_LINK_SECRET: '0123456789abcdef0123456789abcdef' });
  const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = []; const redis = new Map<string, string>();
  globalThis.fetch = (async (input, init) => {
    const url = String(input), method = init?.method ?? 'GET'; const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    calls.push({ url, method, ...(body ? { body } : {}) });
    if (url === 'https://redis.test') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'EVAL') return Response.json({ result: 1 });
      if (command[0] === 'SET') { if (command.includes('NX') && redis.has(String(command[1]))) return Response.json({ result: null }); redis.set(String(command[1]), String(command[2])); return Response.json({ result: 'OK' }); }
      if (command[0] === 'GET') return Response.json({ result: redis.get(String(command[1])) ?? null });
      if (command[0] === 'DEL') { redis.delete(String(command[1])); return Response.json({ result: 1 }); }
    }
    if (url.includes('/suppressions/')) return Response.json({}, { status: 404 });
    if (url.startsWith('https://api.resend.com/contacts/')) return Response.json({}, { status: 404 });
    if (url === 'https://api.resend.com/emails') return Response.json({ id: 'email-id' });
    throw new Error(`Unexpected mocked request ${url}`);
  }) as typeof fetch;
  const response = await POST(new NextRequest('https://www.thearcades.me/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'reader@example.test', audiences: ['fiction'], source: 'subscribe-page' }) }));
  assert.equal(response.status, 200);
  assert.equal(calls.filter((call) => call.method !== 'GET' && call.url.includes('/contacts')).length, 0);
  assert.equal(calls.some((call) => call.url === 'https://api.resend.com/emails'), true);
  assert.equal(calls.filter((call) => call.url.includes('/suppressions/')).length, 1);
  assert.equal(JSON.stringify([...redis.values()]).includes('reader@example.test'), false);
});

test('recipient-wide signup admission throttles before Resend and ignores audience changes', async () => {
  Object.assign(process.env, { RESEND_API_KEY: 'fixture', RESEND_SEND_API_KEY: 'fixture-send-only', RESEND_FROM_EMAIL: 'austen@mail.thearcades.me', RESEND_FROM_NAME: 'Austen', MAIL_PROVIDER: 'resend', UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'fixture', SIGNUP_LINK_SECRET: '0123456789abcdef0123456789abcdef' });
  const calls: string[] = []; const redis = new Map<string, string>();
  globalThis.fetch = (async (input, init) => {
    const url = String(input); calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === 'https://redis.test') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'EVAL') return Response.json({ result: 1 });
      if (command[0] === 'SET') { if (command.includes('NX') && redis.has(String(command[1]))) return Response.json({ result: null }); redis.set(String(command[1]), String(command[2])); return Response.json({ result: 'OK' }); }
      if (command[0] === 'GET') return Response.json({ result: redis.get(String(command[1])) ?? null });
      if (command[0] === 'DEL') { redis.delete(String(command[1])); return Response.json({ result: 1 }); }
    }
    if (url.includes('/suppressions/')) return new Response('', { status: 404 });
    if (url.startsWith('https://api.resend.com/contacts/')) return new Response('', { status: 404 });
    if (url === 'https://api.resend.com/emails') return Response.json({ id: 'email-id' });
    throw new Error(`Unexpected mocked request ${url}`);
  }) as typeof fetch;
  const makeRequest = (audiences: string[]) => POST(new NextRequest('https://www.thearcades.me/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'reader@example.test', audiences, source: 'subscribe-page' }) }));
  assert.equal((await makeRequest(['fiction'])).status, 200);
  const providerCallsBefore = calls.filter((call) => call.includes('api.resend.com')).length;
  assert.equal((await makeRequest(['essays'])).status, 200);
  assert.equal(calls.filter((call) => call.includes('api.resend.com')).length, providerCallsBefore);
  assert.equal(calls.filter((call) => call === 'POST https://api.resend.com/emails').length, 1);
});
