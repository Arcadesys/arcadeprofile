import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { enrollWelcomeSeries, processWelcomeSeriesStep, runDueWelcomeSeries, type SeriesRecord } from './welcome-series';
import { deliverWritingWelcome } from './welcome-delivery';
import { sendWritingWelcomeOnce } from './writing-welcome-email';
import { buildWelcomeSeriesEmail } from './welcome-series-copy';
import { parseKitUnsubscribeToken, signupEmailDigest } from './writing-signup';
import { reconcileVerifiedKitSignups } from './kit-confirmation-reconciliation';

const DAY = 86400000;
const START = Date.UTC(2026, 9, 20, 12);
const names = ['MAIL_PROVIDER', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_FROM_NAME', 'WELCOME_SERIES_ENABLED', 'WRITING_WELCOME_ENABLED', 'SIGNUP_LINK_SECRET', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'POSTMARK_FROM_NAME', 'POSTMARK_TRANSACTIONAL_STREAM', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KIT_API_KEY', 'KIT_TAG_FICTION_ID', 'KIT_TAG_ARCADEPROFILE_ID'];
const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
afterEach(() => { for (const n of names) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; } });

function fixture(provider: 'postmark' | 'resend' = 'postmark') {
  Object.assign(process.env, { MAIL_PROVIDER: provider, RESEND_API_KEY: 'resend-mock', RESEND_FROM_EMAIL: 'writer@mail.example.invalid', RESEND_FROM_NAME: 'Austen', WELCOME_SERIES_ENABLED: 'true', WRITING_WELCOME_ENABLED: 'false',
    SIGNUP_LINK_SECRET: 'a-mocked-series-secret-with-at-least-32-characters', POSTMARK_SERVER_TOKEN: 'mock', POSTMARK_FROM_EMAIL: 'writer@example.com',
    POSTMARK_FROM_NAME: 'Austen', POSTMARK_TRANSACTIONAL_STREAM: 'outbound', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'mock', KIT_API_KEY: 'mock', KIT_TAG_FICTION_ID: '202', KIT_TAG_ARCADEPROFILE_ID: '205' });
  const values = new Map<string, { value: string; until?: number }>();
  const due = new Map<string, number>();
  const commands: unknown[][] = [];
  const sent: Array<Record<string, unknown>> = [];
  const kitCalls: string[] = [];
  const requests: Array<{ url: string; headers: Headers }> = [];
  const digest = signupEmailDigest('reader@example.com');
  const recordKey = `writing:welcome-series:${digest}`;
  const f = { now: START, state: 'active', email: 'reader@example.com', missing: false,
    mode: 'success', loseCommit: false, onKit: undefined as undefined | (() => Promise<void>),
    challenge: undefined as undefined | Record<string, unknown> };
  const get = (k: string) => { const v = values.get(k); if (v?.until && v.until <= f.now) { values.delete(k); return null; } return v?.value ?? null; };
  const fetcher: typeof fetch = async (url, init) => {
    if (String(url) === 'https://redis.example') {
      const c = JSON.parse(String(init?.body)) as Array<string | number>;
      commands.push(c);
      const reply = (result: unknown) => Response.json({ result });
      if (c[0] === 'GET') return reply(get(String(c[1])));
      if (c[0] === 'SMEMBERS') return reply(f.challenge ? ['a'.repeat(32)] : []);
      if (c[0] === 'SREM') return reply(1);
      if (c[0] === 'ZRANGEBYSCORE') return reply([...due].filter(([, t]) => t <= Number(c[3])).sort((a, b) => a[1] - b[1]).slice(0, Number(c[6])).map(([id]) => id));
      if (c[0] === 'ZREM') { due.delete(String(c[2])); return reply(1); }
      if (c[0] === 'SET') {
        if (c.includes('NX') && get(String(c[1])) !== null) return reply(null);
        values.set(String(c[1]), { value: String(c[2]) }); return reply('OK');
      }
      if (c[0] === 'EVAL') {
        const n = Number(c[2]); const keys = c.slice(3, 3 + n).map(String); const args = c.slice(3 + n).map(String);
        if (String(c[1]).includes('welcome-series-enroll-v1')) {
          if (get(keys[0]) !== null) return reply(0);
          values.set(keys[0], { value: 'series:v1' }); values.set(keys[1], { value: args[0], until: f.now + Number(args[1]) }); due.set(args[3], Number(args[2])); return reply(1);
        }
        if (String(c[1]).includes('welcome-series-cas-v1')) {
          if (get(keys[0]) !== args[0]) return reply(0);
          if (f.loseCommit && args[1] && JSON.parse(args[0]).status === 'sending' && JSON.parse(args[1]).status === 'pending') { f.loseCommit = false; throw new Error('lost Redis reply'); }
          if (!args[1]) { values.delete(keys[0]); due.delete(args[4]); }
          else { values.set(keys[0], { value: args[1], until: f.now + Number(args[2]) }); if (args[3] === 'hold') due.delete(args[4]); else due.set(args[4], Number(args[3])); }
          return reply(1);
        }
        if (n === 4 && f.challenge) { f.challenge = JSON.parse(args[1]); values.set(keys[0], { value: args[1] }); return reply('updated'); }
        if (n === 1) {
          if (get(keys[0]) !== args[0]) return reply(0);
          if (String(c[1]).includes("redis.call('DEL'")) values.delete(keys[0]); else values.set(keys[0], { value: args[1] }); return reply(1);
        }
      }
      throw new Error('Unexpected mock Redis command');
    }
    if (String(url).startsWith('https://api.kit.com/v4/')) {
      kitCalls.push(`${init?.method ?? 'GET'} ${url}`);
      if (String(url).includes('/tags/')) return Response.json({});
      assert.equal(String(url), 'https://api.kit.com/v4/subscribers/55');
      if (f.onKit) await f.onKit();
      if (f.missing) return Response.json({}, { status: 404 });
      return Response.json({ subscriber: { id: 55, state: f.state, email_address: f.email } });
    }
    if (String(url) === 'https://api.postmarkapp.com/email' || String(url) === 'https://api.resend.com/emails') {
      assert.equal(String(url), provider === 'resend' ? 'https://api.resend.com/emails' : 'https://api.postmarkapp.com/email');
      requests.push({ url: String(url), headers: new Headers(init?.headers) });
      sent.push(JSON.parse(String(init?.body)));
      if (f.mode === 'timeout') throw new Error('timeout');
      if (f.mode === 'reject') return Response.json(provider === 'resend' ? { name: 'validation_error' } : { ErrorCode: 300 }, { status: 422 });
      if (f.mode === '5xx') return Response.json({}, { status: 500 });
      if (f.mode === 'bad-json') return new Response('not JSON');
      if (f.mode === 'no-id') return Response.json({ ErrorCode: 0 });
      if (f.mode === 'no-code') return Response.json({ MessageID: 'maybe-accepted' });
      if (f.mode === 'unknown-error') return Response.json({ name: 'unfamiliar_error' }, { status: 422 });
      if (f.mode === 'conflict') return Response.json({ name: 'invalid_idempotent_request' }, { status: 409 });
      if (f.mode === 'concurrent') return Response.json({ name: 'concurrent_idempotent_requests' }, { status: 409 });
      if (f.mode === 'quota') return Response.json({ name: 'daily_quota_exceeded' }, { status: 429 });
      return Response.json(provider === 'resend' ? { id: `mock-${sent.length}` } : { ErrorCode: 0, MessageID: `mock-${sent.length}` });
    }
    throw new Error('Unexpected provider call');
  };
  const context = { apiKey: 'mock', fetcher, clock: () => f.now };
  const input = { subscriberId: 55, emailDigest: digest, audiences: ['fiction'] as const };
  const enroll = () => enrollWelcomeSeries({ ...input, audiences: [...input.audiences], ...context });
  const record = () => { const raw = get(recordKey); return raw ? JSON.parse(raw) as SeriesRecord : null; };
  return { f, values, due, commands, sent, requests, kitCalls, digest, recordKey, context, input, enroll, record };
}

test('flag off and conflicting flags enroll/send nothing, including cron', async () => {
  const x = fixture();
  for (const flag of [undefined, 'false', 'TRUE']) {
    if (flag === undefined) delete process.env.WELCOME_SERIES_ENABLED; else process.env.WELCOME_SERIES_ENABLED = flag;
    process.env.WRITING_WELCOME_ENABLED = flag === 'TRUE' ? 'true' : 'false';
    assert.equal(await x.enroll(), 'disabled');
    assert.equal(await processWelcomeSeriesStep(x.digest, x.context), 'disabled');
    assert.equal((await runDueWelcomeSeries(x.context)).checked, 0);
    assert.equal(await deliverWritingWelcome({ ...x.input, audiences: ['fiction'], email: 'reader@example.com', fetcher: x.context.fetcher }), 'disabled');
  }
  assert.equal(x.commands.length + x.kitCalls.length + x.sent.length, 0);
});

test('once-only concurrent enrollment sends email 1, persists no address and shares legacy dedupe', async () => {
  const x = fixture(); const results = await Promise.all([x.enroll(), x.enroll(), x.enroll()]);
  assert.equal(results.filter((r) => r === 'sent').length, 1); assert.equal(x.sent.length, 1);
  assert.equal(x.record()?.step, 1); assert.equal(x.record()?.nextDue, START + 3 * DAY);
  assert.equal(x.record()?.expiresAt, START + 30 * DAY);
  assert.doesNotMatch(JSON.stringify([...x.values]) + JSON.stringify(x.commands), /reader@example\.com|encryptedEmail|email_address/);
  assert.match(String(x.sent[0].TextBody), /lead-magnets\/broomsticks\.pdf/);
  assert.equal(x.sent[0].MessageStream, 'outbound'); assert.equal(x.sent[0].TrackOpens, false); assert.equal(x.sent[0].TrackLinks, 'None');
  const headers = x.sent[0].Headers as Array<{ Name: string; Value: string }>;
  const token = new URL(headers[0].Value.slice(1, -1)).searchParams.get('token')!;
  assert.deepEqual(parseKitUnsubscribeToken(token), { subscriberId: 55, emailDigest: x.digest });
  assert.equal(headers[1].Value, 'List-Unsubscribe=One-Click');
  assert.match(String(x.sent[0].HtmlBody), /subscribe\/unsubscribe#/);
  process.env.WELCOME_SERIES_ENABLED = 'false'; process.env.WRITING_WELCOME_ENABLED = 'true';
  assert.equal(await sendWritingWelcomeOnce({ email: 'reader@example.com', subscriberId: 55, emailDigest: x.digest, audiences: ['fiction'], fetcher: x.context.fetcher }), 'already-claimed');
  assert.equal(x.sent.length, 1);
});

test('existing sent, in-flight or uncertain legacy markers prevent a series', async () => {
  for (const value of ['sending:old-claim', '{"state":"sent"}', 'series:v1']) {
    const x = fixture(); x.values.set(`writing:welcome:${x.digest}`, { value });
    assert.equal(await x.enroll(), 'already-claimed'); assert.equal(x.sent.length, 0); assert.equal(x.record(), null);
  }
});

test('day 3 and day 7 steps, concurrent cron retry, completion and no re-enrollment', async () => {
  const x = fixture(); await x.enroll();
  x.f.now = START + 3 * DAY - 1; assert.equal((await runDueWelcomeSeries(x.context)).sent, 0);
  x.f.now += 1; await Promise.all([runDueWelcomeSeries(x.context), runDueWelcomeSeries(x.context)]);
  assert.equal(x.sent.length, 2); assert.equal(x.record()?.step, 2); assert.equal(x.record()?.nextDue, START + 7 * DAY);
  assert.match(String(x.sent[1].TextBody), /Our Hope Chest/);
  x.f.now = START + 7 * DAY; assert.equal((await runDueWelcomeSeries(x.context)).sent, 1);
  assert.equal(x.record(), null); assert.equal(x.due.size, 0); assert.equal(await x.enroll(), 'already-claimed');
  await runDueWelcomeSeries(x.context); assert.equal(x.sent.length, 3);
  assert.match(String(x.sent[2].TextBody), /Foxtails, only in the book/);
  assert.match(String(x.sent[2].TextBody), /\$4\.99/); assert.match(String(x.sent[2].TextBody), /\$12\.99/);
});

test('no bulk imports, DOI-pending contacts or Work/TH4F-only enrollment', async () => {
  const x = fixture(); await runDueWelcomeSeries(x.context); assert.equal(x.kitCalls.length, 0);
  for (const state of ['inactive', 'unconfirmed', 'cancelled', 'bounced', 'complained', 'unsubscribed']) {
    x.f.state = state; assert.equal(await x.enroll(), 'stopped'); assert.equal(x.values.size, 0);
  }
  x.f.state = 'active';
  assert.equal(await enrollWelcomeSeries({ ...x.context, ...x.input, audiences: ['work-ai', 'th4f'] }), 'disabled');
  assert.equal(x.sent.length, 0);
});

test('each send re-reads Kit; inactive, missing and changed-address subscribers are removed', async () => {
  for (const state of ['inactive', 'unconfirmed', 'cancelled', 'bounced', 'complained', 'unsubscribed', 'missing', 'changed']) {
    const x = fixture(); await x.enroll(); x.f.now += 3 * DAY;
    if (state === 'missing') x.f.missing = true; else if (state === 'changed') x.f.email = 'another@example.com'; else x.f.state = state;
    assert.equal((await runDueWelcomeSeries(x.context)).stopped, 1); assert.equal(x.record(), null); assert.equal(x.due.size, 0); assert.equal(x.sent.length, 1);
  }
});

test('ambiguous Postmark transport outcomes hold the step; cron or re-enrollment never resend', async () => {
  for (const mode of ['timeout', '5xx', 'bad-json', 'no-id', 'no-code']) {
    const x = fixture(); await x.enroll(); x.f.now += 3 * DAY; x.f.mode = mode;
    assert.equal((await runDueWelcomeSeries(x.context)).uncertain, 1); assert.equal(x.record()?.status, 'uncertain');
    x.f.mode = 'success'; x.f.now += 5 * DAY; await runDueWelcomeSeries(x.context);
    assert.equal(await x.enroll(), 'already-claimed'); assert.equal(x.sent.length, 2);
  }
});

test('definite rejection retries no sooner than the next day within original retention', async () => {
  const x = fixture(); x.f.mode = 'reject'; assert.equal(await x.enroll(), 'rejected');
  assert.equal(x.record()?.nextDue, START + DAY); assert.equal(x.record()?.expiresAt, START + 30 * DAY);
  await runDueWelcomeSeries(x.context); assert.equal(x.sent.length, 1);
  x.f.now += DAY; x.f.mode = 'success'; await runDueWelcomeSeries(x.context); assert.equal(x.sent.length, 2); assert.equal(x.record()?.step, 1);
});

test('expired pre-send leases can recover but stale workers cannot send', async () => {
  const x = fixture(); await x.enroll(); x.f.now += 3 * DAY;
  let unblock!: () => void; let entered!: () => void;
  const blocked = new Promise<void>((r) => { unblock = r; }); const ready = new Promise<void>((r) => { entered = r; });
  x.f.onKit = async () => { x.f.onKit = undefined; entered(); await blocked; };
  const stale = processWelcomeSeriesStep(x.digest, x.context); await ready;
  x.f.now += 120001; assert.equal(await processWelcomeSeriesStep(x.digest, x.context), 'sent');
  unblock(); assert.equal(await stale, 'deferred'); assert.equal(x.sent.length, 2);
});

test('a crash/lost commit after a possible send never reclaims the sending state', async () => {
  const x = fixture(); await x.enroll(); x.f.now += 3 * DAY; x.f.loseCommit = true;
  await assert.rejects(processWelcomeSeriesStep(x.digest, x.context)); assert.equal(x.record()?.status, 'sending');
  x.f.now += 120001; assert.equal((await runDueWelcomeSeries(x.context)).uncertain, 1);
  x.f.now += DAY; await runDueWelcomeSeries(x.context); assert.equal(x.sent.length, 2);
});

test('off freezes queued sends and 30-day TTL removes records without re-enrollment', async () => {
  const x = fixture(); await x.enroll(); x.f.now += 3 * DAY;
  const calls = x.commands.length + x.kitCalls.length;
  process.env.WELCOME_SERIES_ENABLED = 'false'; await runDueWelcomeSeries(x.context);
  assert.equal(x.commands.length + x.kitCalls.length, calls); assert.equal(x.sent.length, 1);
  process.env.WELCOME_SERIES_ENABLED = 'true'; x.f.now = START + 31 * DAY;
  await runDueWelcomeSeries(x.context); assert.equal(x.record(), null); assert.equal(x.due.size, 0); assert.equal(await x.enroll(), 'already-claimed');
});

test('the existing verified-ledger reconciliation is the enrollment bridge', async () => {
  const x = fixture();
  // An imported active Kit contact without a first-party challenge is not read.
  await reconcileVerifiedKitSignups(x.context); assert.equal(x.kitCalls.length, 0);
  x.f.challenge = { status: 'awaiting-kit', subscriberId: 55, audiences: ['fiction'], createdAt: START, verifiedAt: START, emailDigest: x.digest };
  x.values.set(`writing:challenge:${'a'.repeat(32)}`, { value: JSON.stringify(x.f.challenge) });
  x.f.state = 'inactive'; await reconcileVerifiedKitSignups(x.context); assert.equal(x.sent.length, 0);
  x.f.state = 'active'; await reconcileVerifiedKitSignups(x.context); assert.equal(x.sent.length, 1);
  assert.equal(x.sent[0].Subject, 'Broomsticks: a door into Estelle’s Children');
  assert.equal(x.f.challenge?.status, 'complete');
});

test('rendered series copy has the gift, free stories, pitch and unsubscribe in every step', () => {
  for (let step = 0; step < 3; step++) {
    const content = buildWelcomeSeriesEmail(step, 'https://example.com/unsubscribe?a=1&b=2');
    assert.match(content.html, /a=1&amp;b=2/); assert.match(content.text, /Unsubscribe from these emails/);
  }
  assert.match(buildWelcomeSeriesEmail(0, '#unsubscribe').html, /broomsticks\.epub/);
  assert.throws(() => buildWelcomeSeriesEmail(3, '#unsubscribe'));
});

for (const provider of ['postmark', 'resend'] as const) {
  test(`${provider}: all steps use shared transport, unchanged bodies and unsubscribe headers`, async () => {
    const x = fixture(provider);
    assert.equal(await x.enroll(), 'sent');
    // Deliver both overdue messages in the same clock window: their keys must
    // distinguish the content, independently of scheduling/provider TTLs.
    x.f.now = START + 8 * DAY;
    await Promise.all([runDueWelcomeSeries(x.context), runDueWelcomeSeries(x.context)]);
    await runDueWelcomeSeries(x.context);
    assert.equal(x.sent.length, 3);
    assert.equal(x.record(), null);
    assert.equal(new Set(x.sent.map((body) => body.subject ?? body.Subject)).size, 3);
    for (let step = 0; step < 3; step++) {
      const body = x.sent[step];
      const request = x.requests[step];
      const headers = provider === 'resend' ? body.headers as Record<string, string>
        : Object.fromEntries((body.Headers as Array<{ Name: string; Value: string }>).map(({ Name, Value }) => [Name, Value]));
      assert.equal(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
      const token = new URL(headers['List-Unsubscribe'].slice(1, -1)).searchParams.get('token')!;
      assert.deepEqual(parseKitUnsubscribeToken(token), { subscriberId: 55, emailDigest: x.digest });
      const fallback = `https://www.thearcades.me/subscribe/unsubscribe#${token}`;
      const expected = buildWelcomeSeriesEmail(step, fallback);
      assert.equal(body.html ?? body.HtmlBody, expected.html);
      assert.equal(body.text ?? body.TextBody, expected.text);
      assert.equal(body.subject ?? body.Subject, expected.subject);
      if (provider === 'resend') {
        assert.equal(request.headers.get('Authorization'), 'Bearer resend-mock');
        assert.equal(request.headers.get('Idempotency-Key'), `welcome-series/${x.digest}/step-${step}`);
        assert.equal(body.from, 'Austen <writer@mail.example.invalid>');
        assert.deepEqual(body.to, ['reader@example.com']);
        assert.deepEqual(body.tags, [{ name: 'category', value: 'writing-welcome' }, { name: 'message_stream', value: 'outbound' }]);
        assert.equal(request.headers.get('X-Postmark-Server-Token'), null);
        assert.equal(body.TrackOpens, undefined); // Resend tracking is a domain setting.
      } else {
        assert.equal(body.MessageStream, 'outbound');
        assert.equal(body.TrackOpens, false); assert.equal(body.TrackLinks, 'None');
        assert.equal(request.headers.get('Authorization'), null);
      }
    }
    assert.doesNotMatch(JSON.stringify([...x.values]) + JSON.stringify(x.commands), /reader@example\.com|encryptedEmail|email_address/);
    assert.equal(await x.enroll(), 'already-claimed');
  });

  test(`${provider}: preflight uses only selected configuration before eligibility/claims`, async () => {
    const x = fixture(provider);
    delete process.env[provider === 'resend' ? 'RESEND_API_KEY' : 'POSTMARK_SERVER_TOKEN'];
    await assert.rejects(x.enroll(), /not configured/);
    assert.equal(x.commands.length + x.kitCalls.length + x.sent.length, 0);
    assert.equal(x.values.size, 0); // Other provider credentials cannot act as fallback.
  });

  test(`${provider}: refusal keeps the step and retry identity without automatic transport retry`, async () => {
    const x = fixture(provider);
    x.f.mode = provider === 'resend' ? 'quota' : 'reject';
    assert.equal(await x.enroll(), 'rejected');
    assert.equal(x.record()?.step, 0); assert.equal(x.record()?.status, 'pending');
    assert.equal(x.record()?.nextDue, START + DAY);
    await runDueWelcomeSeries(x.context); assert.equal(x.sent.length, 1);
    x.f.now += DAY; x.f.mode = 'success';
    assert.equal((await runDueWelcomeSeries(x.context)).sent, 1);
    assert.equal(x.sent.length, 2); assert.equal(x.record()?.step, 1);
    if (provider === 'resend') {
      assert.deepEqual(x.requests.map((request) => request.headers.get('Idempotency-Key')),
        Array(2).fill(`welcome-series/${x.digest}/step-0`));
    }
  });

  for (const mode of ['timeout', '5xx', 'bad-json', 'no-id', 'no-code',
    ...(provider === 'resend' ? ['unknown-error', 'conflict', 'concurrent'] : [])]) {
    test(`${provider} ${mode}: hold uncertain state across cron retries and enrollment`, async () => {
      const x = fixture(provider); await x.enroll(); x.f.now += 3 * DAY; x.f.mode = mode;
      assert.equal((await runDueWelcomeSeries(x.context)).uncertain, 1);
      assert.equal(x.record()?.status, 'uncertain'); assert.equal(x.record()?.step, 1);
      assert.equal(x.due.size, 0);
      x.f.mode = 'success'; x.f.now += 5 * DAY;
      await runDueWelcomeSeries(x.context);
      assert.equal(await processWelcomeSeriesStep(x.digest, x.context), 'uncertain');
      assert.equal(await x.enroll(), 'already-claimed');
      assert.equal(x.sent.length, 2);
    });
  }
}
