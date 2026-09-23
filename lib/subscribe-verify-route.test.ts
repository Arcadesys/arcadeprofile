import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { POST } from '@/app/(frontend)/api/subscribe/verify/route';

const names = ['KIT_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SIGNUP_LINK_SECRET', 'KIT_FORM_FICTION_ID', 'KIT_FORM_LAB_ID', 'KIT_TAG_FICTION_ID', 'KIT_TAG_LAB_ID', 'KIT_TAG_ARCADEPROFILE_ID', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'POSTMARK_TRANSACTIONAL_STREAM'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; } });

test('explicit confirm atomically claims the challenge, adds only selected audiences, and removes email after completion', async () => {
  for (const [name, value] of Object.entries({ KIT_API_KEY: 'kit-test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'redis-test', SIGNUP_LINK_SECRET: 'a-long-signing-secret-for-tests-at-least-32', KIT_FORM_FICTION_ID: '102', KIT_FORM_LAB_ID: '104', KIT_TAG_FICTION_ID: '202', KIT_TAG_LAB_ID: '204', KIT_TAG_ARCADEPROFILE_ID: '205', POSTMARK_SERVER_TOKEN: 'postmark-test', POSTMARK_FROM_EMAIL: 'writer@example.com', POSTMARK_TRANSACTIONAL_STREAM: 'outbound' })) process.env[name] = value;
  const id = '0123456789abcdef0123456789abcdef';
  const { signupEmailDigest } = await import('./writing-signup');
  let challenge: Record<string, unknown> = { encryptedEmail: 'ciphertext', emailDigest: signupEmailDigest('reader@example.com'), audiences: ['fiction', 'lab'], source: 'subscribe-page', createdAt: Date.now(), subscriberId: 55, status: 'pending' };
  const kitWrites: string[] = [];
  const formBodies: unknown[] = [];
  const welcomeBodies: Array<Record<string, unknown>> = [];
  const welcomeClaims = new Map<string, string>();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') {
        const key = String(command[1]);
        if (key.startsWith('writing:welcome:')) {
          if (welcomeClaims.has(key)) return Response.json({ result: null });
          welcomeClaims.set(key, String(command[2]));
        }
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') {
        const key = String(command[3]);
        if (key.startsWith('writing:welcome:')) {
          if (welcomeClaims.get(key) !== String(command[4])) return Response.json({ result: 0 });
          welcomeClaims.set(key, String(command[5]));
          return Response.json({ result: 1 });
        }
        const expected = String(command[5]);
        if (challenge.status !== expected) return Response.json({ result: challenge.status });
        challenge = JSON.parse(String(command[6])) as Record<string, unknown>;
        return Response.json({ result: 'updated' });
      }
      if (command[0] === 'DEL') return Response.json({ result: 1 });
    }
    if (url === 'https://api.kit.com/v4/subscribers/55') return Response.json({ subscriber: { id: 55, state: 'active', email_address: 'reader@example.com' } });
    if (url === 'https://api.postmarkapp.com/email') {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      welcomeBodies.push(body);
      return Response.json({ ErrorCode: 0, MessageID: 'welcome-message-1', Message: 'OK' });
    }
    if (url.includes('/forms/') || url.includes('/tags/')) {
      kitWrites.push(url);
      if (url.includes('/forms/')) formBodies.push(JSON.parse(String(init?.body)));
      return Response.json({ ok: true });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const expiry = Date.now() + 60_000;
  const { createVerificationToken } = await import('./writing-signup');
  const token = createVerificationToken(id, expiry);
  const response = await POST(new Request('https://example.com/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'confirm' }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, status: 'complete', preferences: ['Fiction', 'Lab'] });
  assert.deepEqual(kitWrites.sort(), [
    'https://api.kit.com/v4/forms/102/subscribers/55',
    'https://api.kit.com/v4/forms/104/subscribers/55',
    'https://api.kit.com/v4/tags/202/subscribers/55',
    'https://api.kit.com/v4/tags/204/subscribers/55',
    'https://api.kit.com/v4/tags/205/subscribers/55',
  ].sort());
  assert.deepEqual(formBodies, [
    { referrer: 'https://www.thearcades.me/subscribe' },
    { referrer: 'https://www.thearcades.me/subscribe' },
  ]);
  assert.equal(challenge.status, 'complete');
  assert.equal(challenge.encryptedEmail, undefined);
  assert.equal(welcomeBodies.length, 1);
  assert.equal(welcomeBodies[0].Subject, 'Welcome to the fiction shelf');
  assert.equal(welcomeBodies[0].To, 'reader@example.com');
});

test('inactive Kit subscribers receive no welcome until Kit later confirms them', async () => {
  for (const [name, value] of Object.entries({ KIT_API_KEY: 'kit-test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'redis-test', SIGNUP_LINK_SECRET: 'a-long-signing-secret-for-tests-at-least-32', KIT_FORM_FICTION_ID: '102', KIT_TAG_FICTION_ID: '202', KIT_TAG_ARCADEPROFILE_ID: '205', POSTMARK_SERVER_TOKEN: 'postmark-test', POSTMARK_FROM_EMAIL: 'writer@example.com' })) process.env[name] = value;
  const { signupEmailDigest, createVerificationToken } = await import('./writing-signup');
  const id = '1123456789abcdef0123456789abcdef';
  let challenge: Record<string, unknown> = { encryptedEmail: 'ciphertext', emailDigest: signupEmailDigest('reader@example.com'), audiences: ['fiction'], createdAt: Date.now(), subscriberId: 55, status: 'pending' };
  let postmarkCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') return Response.json({ result: 'OK' });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') {
        challenge = JSON.parse(String(command[6])) as Record<string, unknown>;
        return Response.json({ result: 'updated' });
      }
      if (command[0] === 'DEL') return Response.json({ result: 1 });
    }
    if (url === 'https://api.kit.com/v4/subscribers/55') return Response.json({ subscriber: { id: 55, state: 'inactive', email_address: 'reader@example.com' } });
    if (url === 'https://api.kit.com/v4/forms/102/subscribers/55') return Response.json({ ok: true });
    if (url === 'https://api.postmarkapp.com/email') { postmarkCalls += 1; return Response.json({ ErrorCode: 0, MessageID: 'unexpected', Message: 'OK' }); }
    throw new Error(`Unexpected request ${url}`);
  };
  const token = createVerificationToken(id, Date.now() + 60_000);
  const response = await POST(new Request('https://example.com/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'confirm' }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, status: 'awaiting-kit', preferences: ['Fiction'] });
  assert.equal(postmarkCalls, 0);
  assert.equal(challenge.status, 'awaiting-kit');
});

test('a subscriber cancelled during preference writes never receives the welcome', async () => {
  for (const [name, value] of Object.entries({ KIT_API_KEY: 'kit-test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'redis-test', SIGNUP_LINK_SECRET: 'a-long-signing-secret-for-tests-at-least-32', KIT_FORM_FICTION_ID: '102', KIT_TAG_FICTION_ID: '202', KIT_TAG_ARCADEPROFILE_ID: '205', POSTMARK_SERVER_TOKEN: 'postmark-test', POSTMARK_FROM_EMAIL: 'writer@example.com' })) process.env[name] = value;
  const { signupEmailDigest, createVerificationToken } = await import('./writing-signup');
  const id = '2123456789abcdef0123456789abcdef';
  let challenge: Record<string, unknown> = { encryptedEmail: 'ciphertext', emailDigest: signupEmailDigest('reader@example.com'), audiences: ['fiction'], createdAt: Date.now(), subscriberId: 55, status: 'pending' };
  let subscriberReads = 0;
  let postmarkCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') return Response.json({ result: 'OK' });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') {
        const expected = String(command[5]);
        if (challenge.status !== expected) return Response.json({ result: challenge.status });
        challenge = JSON.parse(String(command[6])) as Record<string, unknown>;
        return Response.json({ result: 'updated' });
      }
      if (command[0] === 'DEL') return Response.json({ result: 1 });
    }
    if (url === 'https://api.kit.com/v4/subscribers/55') {
      subscriberReads += 1;
      const state = subscriberReads === 1 ? 'active' : 'cancelled';
      return Response.json({ subscriber: { id: 55, state, email_address: 'reader@example.com' } });
    }
    if (url.includes('/forms/') || url.includes('/tags/')) return Response.json({ ok: true });
    if (url === 'https://api.postmarkapp.com/email') { postmarkCalls += 1; return Response.json({ ErrorCode: 0, MessageID: 'must-not-send', Message: 'OK' }); }
    throw new Error(`Unexpected request ${url}`);
  };
  const response = await POST(new Request('https://example.com/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: createVerificationToken(id, Date.now() + 60_000), action: 'confirm' }) }));
  assert.equal(response.status, 409);
  assert.equal(subscriberReads, 2);
  assert.equal(postmarkCalls, 0);
  assert.equal(challenge.status, 'blocked');
});

test('a subscriber cancelled after signup is blocked before any form or tag writes', async () => {
  for (const [name, value] of Object.entries({ KIT_API_KEY: 'kit-test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'redis-test', SIGNUP_LINK_SECRET: 'a-long-signing-secret-for-tests-at-least-32', KIT_FORM_FICTION_ID: '102', KIT_TAG_FICTION_ID: '202', KIT_TAG_ARCADEPROFILE_ID: '205' })) process.env[name] = value;
  const id = '0123456789abcdef0123456789abcdef';
  let challenge: Record<string, unknown> = { encryptedEmail: 'ciphertext', audiences: ['fiction'], createdAt: Date.now(), subscriberId: 55, status: 'pending' };
  const kitWrites: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') return Response.json({ result: 'OK' });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') {
        const expected = String(command[5]);
        if (challenge.status !== expected) return Response.json({ result: challenge.status });
        challenge = JSON.parse(String(command[6])) as Record<string, unknown>;
        return Response.json({ result: 'updated' });
      }
      if (command[0] === 'DEL') return Response.json({ result: 1 });
    }
    if (url === 'https://api.kit.com/v4/subscribers/55') return Response.json({ subscriber: { id: 55, state: 'cancelled' } });
    kitWrites.push(url);
    throw new Error(`Unexpected Kit write ${url}`);
  };
  const { createVerificationToken } = await import('./writing-signup');
  const token = createVerificationToken(id, Date.now() + 60_000);
  const response = await POST(new Request('https://example.com/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'confirm' }) }));
  assert.equal(response.status, 409);
  assert.match((await response.json() as { error: string }).error, /No preferences were added/);
  assert.deepEqual(kitWrites, []);
  assert.equal(challenge.status, 'blocked');
  assert.equal(challenge.encryptedEmail, undefined);
});

test('a cancel action cannot report success after confirmation already completed', async () => {
  process.env.KIT_API_KEY = 'kit-test';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test';
  process.env.SIGNUP_LINK_SECRET = 'a-long-signing-secret-for-tests-at-least-32';
  const challenge = { audiences: ['fiction'], createdAt: Date.now(), subscriberId: 55, verifiedAt: Date.now(), status: 'complete' };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      return Response.json({ result: command[0] === 'SET' ? 'OK' : JSON.stringify(challenge) });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const { createVerificationToken } = await import('./writing-signup');
  const token = createVerificationToken('0123456789abcdef0123456789abcdef', Date.now() + 60_000);
  const response = await POST(new Request('https://example.com/api/subscribe/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action: 'cancel' }) }));
  assert.equal(response.status, 409);
  assert.match((await response.json() as { error: string }).error, /already been confirmed/);
});
