import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { reconcileVerifiedKitSignups } from './kit-confirmation-reconciliation';
import { signupEmailDigest } from './writing-signup';

const envNames = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KIT_TAG_ALL_WRITING_ID', 'KIT_TAG_FICTION_ID', 'KIT_TAG_ESSAYS_ID', 'KIT_TAG_LAB_ID', 'KIT_TAG_ARCADEPROFILE_ID', 'KIT_API_KEY', 'SIGNUP_LINK_SECRET', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'WRITING_WELCOME_ENABLED'];
const saved = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
afterEach(() => { for (const name of envNames) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; } });

function configure() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test';
  process.env.KIT_TAG_ALL_WRITING_ID = '201';
  process.env.KIT_TAG_FICTION_ID = '202';
  process.env.KIT_TAG_ESSAYS_ID = '203';
  process.env.KIT_TAG_LAB_ID = '204';
  process.env.KIT_TAG_ARCADEPROFILE_ID = '205';
  process.env.KIT_API_KEY = 'kit-test';
  process.env.SIGNUP_LINK_SECRET = 'a-long-signing-key-for-writing-welcome-tests';
}

test('cron tags only the selected audiences saved by explicit verification and never scans Kit forms', async () => {
  configure();
  let challenge: Record<string, unknown> = { audiences: ['fiction', 'lab'], createdAt: Date.now(), verifiedAt: Date.now(), subscriberId: 55, status: 'awaiting-kit' };
  const calls: Array<{ url: string; command?: string[] }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      calls.push({ url, command });
      if (command[0] === 'SMEMBERS') return Response.json({ result: ['a'.repeat(32)] });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') { challenge = JSON.parse(String(command[8])) as Record<string, unknown>; return Response.json({ result: 'updated' }); }
      return Response.json({ result: 1 });
    }
    calls.push({ url });
    if (url === 'https://api.kit.com/v4/subscribers/55') return Response.json({ subscriber: { id: 55, state: 'active' } });
    if (url === 'https://api.kit.com/v4/tags/202/subscribers/55' || url === 'https://api.kit.com/v4/tags/204/subscribers/55' || url === 'https://api.kit.com/v4/tags/205/subscribers/55') return Response.json({ ok: true });
    throw new Error(`Unexpected request ${url}`);
  };
  const result = await reconcileVerifiedKitSignups({ apiKey: 'kit-test', fetcher });
  assert.deepEqual(result, { checked: 1, tagged: 2, pending: 0, failed: 0, remaining: 0 });
  assert.deepEqual(calls.filter((call) => call.url.includes('/tags/')).map((call) => call.url), [
    'https://api.kit.com/v4/tags/202/subscribers/55',
    'https://api.kit.com/v4/tags/204/subscribers/55',
    'https://api.kit.com/v4/tags/205/subscribers/55',
  ]);
  assert.equal(calls.some((call) => call.url.includes('/forms/')), false);
  assert.equal(challenge.encryptedEmail, undefined);
});

test('inactive subscriber remains queued with no tag writes', async () => {
  configure();
  const challenge = { emailDigest: signupEmailDigest('reader@example.com'), audiences: ['all'], createdAt: Date.now(), subscriberId: 56, status: 'awaiting-kit' };
  let tagged = false;
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input) === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      if (command[0] === 'SMEMBERS') return Response.json({ result: ['b'.repeat(32)] });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'EVAL') return Response.json({ result: 'updated' });
      return Response.json({ result: 1 });
    }
    if (String(input) === 'https://api.kit.com/v4/subscribers/56') return Response.json({ subscriber: { id: 56, state: 'inactive', email_address: 'reader@example.com' } });
    if (String(input).includes('/tags/')) tagged = true;
    throw new Error(`Unexpected request ${String(input)}`);
  };
  const result = await reconcileVerifiedKitSignups({ apiKey: 'kit-test', fetcher });
  assert.deepEqual(result, { checked: 1, tagged: 0, pending: 1, failed: 0, remaining: 0 });
  assert.equal(tagged, false);
});

test('cron sends one selected welcome only after an explicitly verified challenge is active', async () => {
  configure();
  process.env.POSTMARK_SERVER_TOKEN = 'postmark-test';
  process.env.POSTMARK_FROM_EMAIL = 'writer@example.com';
  process.env.WRITING_WELCOME_ENABLED = 'true';
  let challenge: Record<string, unknown> = { emailDigest: signupEmailDigest('reader@example.com'), audiences: ['lab', 'essays'], createdAt: Date.now(), verifiedAt: Date.now(), subscriberId: 57, status: 'awaiting-kit' };
  const claims = new Map<string, string>();
  const emails: Array<Record<string, unknown>> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SMEMBERS') return Response.json({ result: ['c'.repeat(32)] });
      if (command[0] === 'GET') return Response.json({ result: JSON.stringify(challenge) });
      if (command[0] === 'SET') {
        const key = String(command[1]);
        if (claims.has(key)) return Response.json({ result: null });
        claims.set(key, String(command[2]));
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'EVAL') {
        const key = String(command[3]);
        if (key.startsWith('writing:welcome:')) {
          if (claims.get(key) !== String(command[4])) return Response.json({ result: 0 });
          claims.set(key, String(command[5]));
          return Response.json({ result: 1 });
        }
        challenge = JSON.parse(String(command[8])) as Record<string, unknown>;
        return Response.json({ result: 'updated' });
      }
      return Response.json({ result: 1 });
    }
    if (url === 'https://api.kit.com/v4/subscribers/57') return Response.json({ subscriber: { id: 57, state: 'active', email_address: 'reader@example.com' } });
    if (url.startsWith('https://api.kit.com/v4/tags/')) return Response.json({ ok: true });
    if (url === 'https://api.postmarkapp.com/email') {
      emails.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ ErrorCode: 0, MessageID: 'welcome-cron-1', Message: 'OK' });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  const result = await reconcileVerifiedKitSignups({ apiKey: 'kit-test', fetcher });
  assert.deepEqual(result, { checked: 1, tagged: 2, pending: 0, failed: 0, remaining: 0 });
  assert.equal(emails.length, 1);
  assert.equal(emails[0].To, 'reader@example.com');
  assert.equal(emails[0].Subject, 'Welcome to the essays');
  assert.equal(challenge.status, 'complete');
});
