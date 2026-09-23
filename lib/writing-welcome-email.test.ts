import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { buildWritingWelcomeEmail, primaryWritingWelcomeAudience, sendWritingWelcomeOnce } from './writing-welcome-email';
import { parseKitUnsubscribeToken, signupEmailDigest } from './writing-signup';

const envNames = ['SIGNUP_LINK_SECRET', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'POSTMARK_FROM_NAME', 'POSTMARK_TRANSACTIONAL_STREAM', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
afterEach(() => { for (const name of envNames) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } });

function configure() {
  process.env.SIGNUP_LINK_SECRET = 'writing-welcome-test-secret-with-at-least-32-chars';
  process.env.POSTMARK_SERVER_TOKEN = 'postmark-test';
  process.env.POSTMARK_FROM_EMAIL = 'writer@example.com';
  process.env.POSTMARK_FROM_NAME = 'The Arcades';
  process.env.POSTMARK_TRANSACTIONAL_STREAM = 'outbound';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test';
}

test('welcome selection uses deterministic preference priority and approved copy', () => {
  assert.equal(primaryWritingWelcomeAudience(['lab', 'essays', 'fiction']), 'fiction');
  assert.equal(primaryWritingWelcomeAudience(['lab', 'essays', 'all', 'fiction']), 'all');
  assert.equal(primaryWritingWelcomeAudience(['lab']), 'lab');
  const fiction = buildWritingWelcomeEmail(['lab', 'fiction', 'essays']);
  assert.equal(fiction.subject, 'Welcome to the fiction shelf');
  assert.match(fiction.preview, /downloadable editions/);
  assert.match(fiction.html, /href="https:\/\/thearcades\.me\/stories"/);
  assert.match(fiction.text, /the fiction shelf \(https:\/\/thearcades\.me\/stories\)/);
  const all = buildWritingWelcomeEmail(['all', 'lab']);
  assert.equal(all.subject, "Welcome to The Arcades' writing");
  assert.match(all.html, /href="https:\/\/thearcades\.me\/writing"/);
  assert.match(all.html, /href="https:\/\/thearcades\.me\/essays"/);
});

test('one address gets at most one welcome across repeat challenges', async () => {
  configure();
  const ledger = new Map<string, string>();
  const sent: Array<Record<string, unknown>> = [];
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input) === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') {
        const key = String(command[1]);
        if (command.includes('NX') && ledger.has(key)) return Response.json({ result: null });
        ledger.set(key, String(command[2]));
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'EVAL') {
        const key = String(command[3]);
        const prior = String(command[4]);
        if (ledger.get(key) !== prior) return Response.json({ result: 0 });
        if (String(command[1]).includes("redis.call('DEL'")) ledger.delete(key);
        else ledger.set(key, String(command[5]));
        return Response.json({ result: 1 });
      }
    }
    if (String(input) === 'https://api.postmarkapp.com/email') {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      sent.push(body);
      return Response.json({ ErrorCode: 0, MessageID: 'welcome-1', Message: 'OK' });
    }
    throw new Error(`Unexpected request ${String(input)}`);
  };
  const digest = signupEmailDigest('Reader@Example.com');
  assert.equal(digest, signupEmailDigest('reader@example.com'));
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 456, emailDigest: digest, audiences: ['lab', 'essays', 'fiction'], fetcher }), 'sent');
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 456, emailDigest: digest, audiences: ['essays'], fetcher }), 'already-claimed');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].Subject, 'Welcome to the fiction shelf');
  assert.equal(sent[0].MessageStream, 'outbound');
  assert.equal(sent[0].TrackLinks, 'None');
  const headers = sent[0].Headers as Array<{ Name: string; Value: string }>;
  assert.equal(headers[1].Name, 'List-Unsubscribe-Post');
  assert.equal(headers[1].Value, 'List-Unsubscribe=One-Click');
  const oneClickUrl = new URL(headers[0].Value.slice(1, -1));
  assert.equal(oneClickUrl.origin, 'https://www.thearcades.me');
  assert.equal(oneClickUrl.pathname, '/api/subscribe/unsubscribe');
  assert.deepEqual(parseKitUnsubscribeToken(oneClickUrl.searchParams.get('token')!), { subscriberId: 456, emailDigest: digest });
  assert.match(String(sent[0].HtmlBody), /href="https:\/\/www\.thearcades\.me\/subscribe\/unsubscribe#/);
  assert.match(String(sent[0].HtmlBody), /Stories, serial work, and downloadable editions/);
  assert.match(String(sent[0].TextBody), /https:\/\/thearcades\.me\/stories/);
  assert.doesNotMatch([...ledger.keys()].join(' '), /reader@example\.com/i);
});

test('ambiguous Postmark result keeps the one-time claim, while a definite rejection releases it', async () => {
  configure();
  const ledger = new Map<string, string>();
  let postmarkCalls = 0;
  let mode: 'timeout' | 'reject' | 'success' = 'timeout';
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input) === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      if (command[0] === 'SET') {
        const key = String(command[1]);
        if (command.includes('NX') && ledger.has(key)) return Response.json({ result: null });
        ledger.set(key, String(command[2]));
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'EVAL') {
        const key = String(command[3]);
        const prior = String(command[4]);
        if (ledger.get(key) !== prior) return Response.json({ result: 0 });
        if (String(command[1]).includes("redis.call('DEL'")) ledger.delete(key);
        else ledger.set(key, String(command[5]));
        return Response.json({ result: 1 });
      }
    }
    if (String(input) === 'https://api.postmarkapp.com/email') {
      postmarkCalls += 1;
      if (mode === 'timeout') throw new Error('network timeout');
      if (mode === 'reject') return Response.json({ ErrorCode: 300, Message: 'Rejected' }, { status: 422 });
      return Response.json({ ErrorCode: 0, MessageID: 'welcome-2', Message: 'OK' });
    }
    throw new Error(`Unexpected request ${String(input)}`);
  };
  const emailDigest = signupEmailDigest('reader@example.com');
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 89, emailDigest, audiences: ['all'], fetcher }), 'uncertain');
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 89, emailDigest, audiences: ['all'], fetcher }), 'already-claimed');
  assert.equal(postmarkCalls, 1);

  const retryDigest = signupEmailDigest('retry@example.com');
  mode = 'reject';
  assert.equal(await sendWritingWelcomeOnce({ email: 'retry@example.com', subscriberId: 91, emailDigest: retryDigest, audiences: ['lab'], fetcher }), 'rejected');
  mode = 'success';
  assert.equal(await sendWritingWelcomeOnce({ email: 'retry@example.com', subscriberId: 91, emailDigest: retryDigest, audiences: ['lab'], fetcher }), 'sent');
  assert.equal(postmarkCalls, 3);
});
