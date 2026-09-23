import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createVerificationToken, decryptSignupEmail, encryptSignupEmail, parseVerificationToken, redisCommand, sendVerificationEmail, verificationSiteUrl } from './writing-signup';

const previous = process.env.SIGNUP_LINK_SECRET;
afterEach(() => { if (previous === undefined) delete process.env.SIGNUP_LINK_SECRET; else process.env.SIGNUP_LINK_SECRET = previous; });

test('verification token is signed, expires, and contains no email or audience data', () => {
  process.env.SIGNUP_LINK_SECRET = 'a-long-test-signing-key-for-unit-tests';
  const id = '0123456789abcdef0123456789abcdef';
  const expires = Date.now() + 60_000;
  const token = createVerificationToken(id, expires);
  assert.deepEqual(parseVerificationToken(token), { id, expiresAt: expires });
  assert.equal(token.includes('@'), false);
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(parseVerificationToken(tampered), null);
  assert.equal(parseVerificationToken(createVerificationToken(id, Date.now() - 32 * 24 * 60 * 60 * 1000)), null);
});

test('pending signup email is encrypted at rest and decrypts only with the signing secret', () => {
  process.env.SIGNUP_LINK_SECRET = 'a-long-test-signing-key-for-unit-tests';
  const encrypted = encryptSignupEmail('reader@example.com');
  assert.notEqual(encrypted, 'reader@example.com');
  assert.equal(decryptSignupEmail(encrypted), 'reader@example.com');
  process.env.SIGNUP_LINK_SECRET = 'a-different-test-signing-key-for-unit-tests';
  assert.throws(() => decryptSignupEmail(encrypted));
});

test('Redis accepts Vercel-injected Upstash credentials when direct Upstash names are absent', async () => {
  const prior = Object.fromEntries(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].map((name) => [name, process.env[name]]));
  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = 'https://redis.example/';
    process.env.KV_REST_API_TOKEN = 'kv-test';
    let requestUrl = '';
    const value = await redisCommand<string>(['PING'], async (input, init) => {
      requestUrl = String(input);
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer kv-test');
      return Response.json({ result: 'PONG' });
    });
    assert.equal(requestUrl, 'https://redis.example');
    assert.equal(value, 'PONG');
  } finally {
    for (const [name, value] of Object.entries(prior)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});

test('verification links use a trusted Vercel preview host and keep production canonical', () => {
  const prior = Object.fromEntries(['VERCEL_ENV', 'VERCEL_URL', 'NEXT_PUBLIC_SITE_URL'].map((name) => [name, process.env[name]]));
  try {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'arcadeprofile-git-branch.vercel.app';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.thearcades.me';
    assert.equal(verificationSiteUrl(), 'https://arcadeprofile-git-branch.vercel.app');
    process.env.VERCEL_URL = 'evil.example';
    assert.throws(() => verificationSiteUrl());
    process.env.VERCEL_ENV = 'production';
    assert.equal(verificationSiteUrl(), 'https://www.thearcades.me');
  } finally {
    for (const [name, value] of Object.entries(prior)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});

test('verification email explains the second confirmation and presents overlapping topics once', async () => {
  const names = ['POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'VERCEL_ENV', 'NEXT_PUBLIC_SITE_URL'];
  const prior = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.POSTMARK_SERVER_TOKEN = 'test-token';
    process.env.POSTMARK_FROM_EMAIL = 'reply@example.com';
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://thearcades.me';
    let body: Record<string, string> = {};
    await sendVerificationEmail({ email: 'reader@example.com', token: 'test-token', audiences: ['all', 'fiction', 'essays', 'lab'] }, async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, string>;
      return Response.json({ ErrorCode: 0, MessageID: 'test-message' });
    });
    assert.equal(body.Subject, 'Confirm your updates from The Arcades');
    assert.match(body.HtmlBody, /All writing \(fiction and essays\), The Arcades' Lab/);
    assert.doesNotMatch(body.HtmlBody, /All writing[^<]*, Fiction, Essays/);
    assert.match(body.TextBody, /Kit may send additional confirmation emails/);
    assert.match(body.TextBody, /https:\/\/thearcades\.me\/subscribe\/verify#test-token/);
  } finally {
    for (const [name, value] of Object.entries(prior)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
