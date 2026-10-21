import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { buildWritingWelcomeEmail, primaryWritingWelcomeAudience, sendWritingWelcomeOnce } from './writing-welcome-email';
import { parseKitUnsubscribeToken, signupEmailDigest } from './writing-signup';

const envNames = ['MAIL_PROVIDER', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'SIGNUP_LINK_SECRET', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'POSTMARK_FROM_NAME', 'POSTMARK_TRANSACTIONAL_STREAM', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'WRITING_WELCOME_ENABLED'];
const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
afterEach(() => { for (const name of envNames) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; } });

function configure() {
  delete process.env.MAIL_PROVIDER;
  process.env.SIGNUP_LINK_SECRET = 'writing-welcome-test-secret-with-at-least-32-chars';
  process.env.POSTMARK_SERVER_TOKEN = 'postmark-test';
  process.env.POSTMARK_FROM_EMAIL = 'writer@example.com';
  process.env.POSTMARK_FROM_NAME = 'The Arcades';
  process.env.POSTMARK_TRANSACTIONAL_STREAM = 'outbound';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test';
  process.env.WRITING_WELCOME_ENABLED = 'true';
}

test('welcome stays disabled until WRITING_WELCOME_ENABLED is explicitly true', async () => {
  configure();
  delete process.env.WRITING_WELCOME_ENABLED;
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls += 1; throw new Error('must not send'); };
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 12, emailDigest: signupEmailDigest('reader@example.com'), audiences: ['all'], fetcher }), 'disabled');
  assert.equal(calls, 0);
});

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

for (const outcome of ['success', 'quota', 'conflict', 'missing-receipt', 'timeout'] as const) {
  test(`Resend welcome ${outcome}: preserves one-time durable claim and unsubscribe headers`, async () => {
    configure(); process.env.MAIL_PROVIDER = 'resend'; process.env.RESEND_API_KEY = 'fixture-key'; process.env.RESEND_FROM_EMAIL = 'writer@mail.example.invalid';
    const ledger = new Map<string, string>();
    let sends = 0;
    const emailDigest = signupEmailDigest('reader@example.invalid');
    const fetcher: typeof fetch = async (url, init) => {
      if (String(url) === 'https://redis.example') {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[0] === 'SET') {
          if (ledger.has(command[1])) return Response.json({ result: null });
          ledger.set(command[1], command[2]); return Response.json({ result: 'OK' });
        }
        if (String(command[1]).includes("redis.call('DEL'")) ledger.delete(command[3]);
        else ledger.set(command[3], command[5]);
        return Response.json({ result: 1 });
      }
      assert.equal(url, 'https://api.resend.com/emails'); sends++;
      const body = JSON.parse(String(init?.body));
      assert.equal(new Headers(init?.headers).get('Idempotency-Key'), `writing-welcome/${emailDigest}`);
      assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
      assert.match(body.headers['List-Unsubscribe'], /^<https:\/\/www.thearcades.me\/api\/subscribe\/unsubscribe\?token=/);
      assert.match(body.html, /unsubscribe#/); assert.match(body.text, /unsubscribe#/);
      if (outcome === 'quota') return Response.json({ name: 'daily_quota_exceeded' }, { status: 429 });
      if (outcome === 'conflict') return Response.json({ name: 'invalid_idempotent_request' }, { status: 409 });
      if (outcome === 'missing-receipt') return Response.json({});
      if (outcome === 'timeout') throw new Error('fixture-key reader@example.invalid');
      return Response.json({ id: 'fixture-id' });
    };
    const input = { email: 'reader@example.invalid', emailDigest, subscriberId: 89, audiences: ['all'] as const, fetcher };
    const send = () => sendWritingWelcomeOnce({ ...input, audiences: [...input.audiences] });
    assert.equal(await send(), outcome === 'success' ? 'sent' : outcome === 'quota' ? 'rejected' : 'uncertain');
    assert.equal(ledger.size, outcome === 'quota' ? 0 : 1);
    if (outcome !== 'quota') { assert.equal(await send(), 'already-claimed'); assert.equal(sends, 1); }
  });
}

test('welcome configuration failure never acquires a claim', async () => {
  configure(); process.env.MAIL_PROVIDER = 'resend'; delete process.env.RESEND_API_KEY;
  await assert.rejects(sendWritingWelcomeOnce({ email: 'reader@example.invalid', emailDigest: signupEmailDigest('reader@example.invalid'), subscriberId: 89, audiences: ['all'], fetcher: async () => { assert.fail('No partial requests'); } }), /RESEND_API_KEY/);
});
