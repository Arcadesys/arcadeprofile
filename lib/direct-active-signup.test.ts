import assert from 'node:assert/strict';
import { afterEach, test as nodeTest } from 'node:test';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as signup } from '@/app/(frontend)/api/subscribe/route';
import { POST as confirm } from '@/app/(frontend)/api/subscribe/verify/route';
import { reconcileVerifiedKitSignups } from './kit-confirmation-reconciliation';
import { runDueWelcomeSeries } from './welcome-series';
import { createVerificationToken, signupEmailDigest, type SignupChallenge } from './writing-signup';
import { kitDirectActiveSignupEnabled } from './signup-mode';
import type { Audience } from './subscribe-types';

const config = {
  KIT_DIRECT_ACTIVE_SIGNUP: 'true', KIT_API_KEY: 'mock', UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'mock', SIGNUP_LINK_SECRET: 'mock-signup-secret-with-at-least-32-characters',
  KIT_TAG_FICTION_ID: '202', KIT_TAG_LAB_ID: '204', KIT_TAG_ARCADEPROFILE_ID: '205',
  POSTMARK_SERVER_TOKEN: 'mock', POSTMARK_FROM_EMAIL: 'writer@example.com',
  RESEND_API_KEY: 'mock-resend', RESEND_FROM_EMAIL: 'writer@mail.example.com',
  WRITING_WELCOME_ENABLED: 'false', WELCOME_SERIES_ENABLED: 'false',
};
const names = [...Object.keys(config), 'MAIL_PROVIDER', 'KIT_FORM_FICTION_ID', 'KIT_FORM_LAB_ID'];
type Provider = 'resend' | 'postmark';
let provider: Provider = 'resend';
function test(name: string, body: () => void | Promise<void>) {
  for (const selected of ['resend', 'postmark'] as const) {
    nodeTest(`${selected}: ${name}`, async () => { provider = selected; await body(); });
  }
}
const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const n of names) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; }
});

/** Mock every network boundary, including Redis transitions and Kit's documented
 * upsert semantics: POST cannot change an existing subscriber's state. */
function fixture(initialState: string | null = null) {
  Object.assign(process.env, config);
  process.env.MAIL_PROVIDER = provider;
  // Only the selected provider is configured: no Postmark-only preflight.
  if (provider === 'resend') { delete process.env.POSTMARK_SERVER_TOKEN; delete process.env.POSTMARK_FROM_EMAIL; }
  else { delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM_EMAIL; }
  delete process.env.KIT_FORM_FICTION_ID;
  delete process.env.KIT_FORM_LAB_ID;
  const values = new Map<string, string>();
  const awaiting = new Set<string>();
  const due = new Map<string, number>();
  const tags = new Set(['999']); // An unrelated pre-existing topic must survive.
  const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
  const emails: Array<Record<string, unknown>> = [];
  const mailRequests: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
  const metrics = { first_party_verified: 0, kit_active_ready: 0, kit_doi_fallback: 0 };
  let state = initialState;
  let failTag = false;
  let failForm = false;
  const reply = (result: unknown) => Response.json({ result });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const c = JSON.parse(String(init?.body)) as Array<string | number>;
      const key = String(c[1]);
      if (c[0] === 'SET') {
        if (c.includes('NX') && values.has(key)) return reply(null);
        values.set(key, String(c[2])); return reply('OK');
      }
      if (c[0] === 'GET') return reply(values.get(key) ?? null);
      if (c[0] === 'DEL') return reply(values.delete(key) ? 1 : 0);
      if (c[0] === 'SMEMBERS') return reply([...awaiting]);
      if (c[0] === 'SREM') { awaiting.delete(String(c[2])); return reply(1); }
      if (c[0] === 'ZRANGEBYSCORE') return reply([...due].filter(([, t]) => t <= Number(c[3])).map(([id]) => id));
      if (c[0] === 'EVAL') {
        const n = Number(c[2]); const keys = c.slice(3, 3 + n).map(String); const args = c.slice(3 + n).map(String);
        if (String(c[1]).includes('welcome-series-enroll-v1')) {
          if (values.has(keys[0])) return reply(0);
          values.set(keys[0], 'series:v1'); values.set(keys[1], args[0]); due.set(args[3], Number(args[2])); return reply(1);
        }
        if (String(c[1]).includes('welcome-series-cas-v1')) {
          if (values.get(keys[0]) !== args[0]) return reply(0);
          if (!args[1]) { values.delete(keys[0]); due.delete(args[4]); }
          else { values.set(keys[0], args[1]); if (args[3] === 'hold') due.delete(args[4]); else due.set(args[4], Number(args[3])); }
          return reply(1);
        }
        if (n === 1) {
          if (values.get(keys[0]) !== args[0]) return reply(0);
          values.delete(keys[0]); return reply(1);
        }
        assert.equal(n, 4);
        const raw = values.get(keys[0]);
        if (!raw) return reply('missing');
        const current = JSON.parse(raw) as SignupChallenge;
        if (current.status !== args[0]) return reply(current.status);
        if (args[5] && current.processingToken !== args[5]) return reply('lease_mismatch');
        const next = JSON.parse(args[1]) as SignupChallenge;
        if (!current.verifiedAt && next.verifiedAt) metrics.first_party_verified += 1;
        if (!current.kitDoiFallback && next.kitDoiFallback) metrics.kit_doi_fallback += 1;
        if (!current.kitActiveAt && next.kitActiveAt) metrics.kit_active_ready += 1;
        values.set(keys[0], args[1]);
        if (next.status === 'awaiting-kit') awaiting.add(args[4]); else awaiting.delete(args[4]);
        return reply('updated');
      }
      throw new Error(`Unexpected mock Redis command ${c[0]}`);
    }
    if (url.startsWith('https://api.kit.com/v4/')) {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      calls.push({ url, method, body });
      const subscriber = () => ({ id: 55, state, email_address: 'reader@example.com' });
      if (url.startsWith('https://api.kit.com/v4/subscribers?')) return Response.json({ subscribers: state ? [subscriber()] : [] });
      if (url === 'https://api.kit.com/v4/subscribers' && method === 'POST') {
        if (!state) state = String(body?.state);
        return Response.json({ subscriber: subscriber() });
      }
      if (url === 'https://api.kit.com/v4/subscribers/55' && method === 'GET') return Response.json({ subscriber: subscriber() });
      if (url.includes('/tags/') && method === 'POST') {
        if (failTag) { failTag = false; return Response.json({}, { status: 503 }); }
        tags.add(url.split('/tags/')[1].split('/')[0]); return Response.json({});
      }
      if (url.includes('/forms/') && method === 'POST') {
        if (failForm) { failForm = false; return Response.json({}, { status: 503 }); }
        return Response.json({});
      }
      throw new Error(`Unexpected Kit call ${method} ${url}`);
    }
    if (url === 'https://api.resend.com/emails' || url === 'https://api.postmarkapp.com/email') {
      assert.equal(url, provider === 'resend' ? 'https://api.resend.com/emails' : 'https://api.postmarkapp.com/email');
      const raw = JSON.parse(String(init?.body)) as Record<string, unknown>;
      mailRequests.push({ headers: new Headers(init?.headers), body: raw });
      const email = provider === 'resend' ? { Subject: raw.subject, TextBody: raw.text, HtmlBody: raw.html } : raw;
      emails.push(email);
      return provider === 'resend' ? Response.json({ id: `mock-${emails.length}` }) : Response.json({ ErrorCode: 0, MessageID: `mock-${emails.length}` });
    }
    throw new Error(`Unexpected provider ${url}`);
  };
  const writes = () => calls.filter((c) => c.method !== 'GET');
  const challenges = () => [...values].filter(([k]) => k.startsWith('writing:challenge:')).map(([, raw]) => JSON.parse(raw) as SignupChallenge);
  return { values, awaiting, due, tags, calls, emails, mailRequests, metrics, writes, challenges,
    setState: (next: string) => { state = next; }, failOneTag: () => { failTag = true; }, failOneForm: () => { failForm = true; } };
}

async function request(audiences: Audience[] = ['fiction', 'lab']) {
  const response = await signup(new NextRequest('https://www.thearcades.me/api/subscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'Reader@Example.com', audiences, source: 'subscribe-page' }),
  }));
  assert.equal(response.status, 200);
}
function tokenFrom(email: Record<string, unknown>) {
  const token = String(email.TextBody).match(/\/subscribe\/verify#([^\s]+)/)?.[1];
  assert.ok(token); return token;
}
const claim = (token: string, action = 'confirm') => confirm(new Request('https://www.thearcades.me/api/subscribe/verify', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action }),
}));
function expireLease(x: ReturnType<typeof fixture>) {
  for (const [key, raw] of x.values) if (key.startsWith('writing:challenge:')) {
    x.values.set(key, JSON.stringify({ ...JSON.parse(raw), processingUntil: 0 }));
  }
}

test('unset/false/other flag values preserve the default; only true enables direct signup', () => {
  for (const flag of [undefined, 'false', '1', 'yes', '']) {
    if (flag === undefined) delete process.env.KIT_DIRECT_ACTIVE_SIGNUP; else process.env.KIT_DIRECT_ACTIVE_SIGNUP = flag;
    assert.equal(kitDirectActiveSignupEnabled(), false);
  }
  process.env.KIT_DIRECT_ACTIVE_SIGNUP = 'true';
  assert.equal(kitDirectActiveSignupEnabled(), true);
});

test('new direct signup has no Kit writes before confirm, creates active + selected tags without forms, clears ciphertext, counts once', async () => {
  const x = fixture();
  await request();
  assert.deepEqual(x.writes(), []);
  assert.match(String(x.emails[0].TextBody), /no second confirmation email/);
  assert.doesNotMatch(String(x.emails[0].TextBody), /Kit may/);
  const token = tokenFrom(x.emails[0]);
  if (provider === 'resend') {
    assert.equal(x.mailRequests[0].headers.get('Idempotency-Key'), `signup-verification/${createHash('sha256').update(token).digest('hex')}`);
    assert.doesNotMatch(x.mailRequests[0].headers.get('Idempotency-Key')!, /reader@example|\./);
  } else {
    assert.equal(x.mailRequests[0].body.TrackOpens, false);
    assert.equal(x.mailRequests[0].body.TrackLinks, 'None');
  }
  assert.equal((await claim(token)).status, 200);
  assert.deepEqual(x.writes().map((c) => c.body).filter((b) => b?.state), [{ email_address: 'reader@example.com', state: 'active' }]);
  assert.deepEqual([...x.tags].sort(), ['202', '204', '205', '999']);
  assert.equal(x.calls.some((c) => c.url.includes('/forms/')), false);
  const [record] = x.challenges();
  assert.equal(record.status, 'complete');
  assert.equal(record.signupFlow, 'direct-active');
  assert.equal(record.encryptedEmail, undefined);
  assert.equal(record.source, undefined);
  assert.ok(record.verifiedAt && record.kitActiveAt);
  assert.equal(JSON.stringify(record).includes('reader@example.com'), false);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 1, kit_doi_fallback: 0 });
  assert.equal((await claim(token)).status, 200);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 1, kit_doi_fallback: 0 });
  const callsBefore = x.calls.length;
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).checked, 0);
  assert.equal(x.calls.length, callsBefore);
});

test('active repeat signup adds topics, never removes old tags, and needs no form IDs', async () => {
  const x = fixture('active');
  await request(['fiction']);
  assert.equal((await claim(tokenFrom(x.emails[0]))).status, 200);
  await request(['lab', 'work-ai']);
  assert.equal((await claim(tokenFrom(x.emails[1]))).status, 200);
  assert.deepEqual([...x.tags].sort(), ['202', '204', '205', '23806915', '999'].sort());
  assert.equal(x.calls.some((c) => c.url.includes('/forms/')), false);
  assert.ok(x.writes().every((c) => c.url.includes('/tags/') && c.method === 'POST'));
});

for (const state of ['cancelled', 'bounced', 'complained']) {
  test(`suppressed ${state} address receives no verification or Kit writes`, async () => {
    const x = fixture(state);
    await request();
    assert.deepEqual(x.writes(), []); assert.deepEqual(x.emails, []); assert.equal(x.values.size, 0);
  });
  test(`address becoming ${state} before confirm is untouched, even when the original lookup found no subscriber`, async () => {
    const x = fixture(); await request(); x.setState(state);
    assert.equal((await claim(tokenFrom(x.emails[0]))).status, 409);
    assert.deepEqual(x.writes(), []); assert.equal(x.challenges()[0].status, 'blocked');
    assert.equal(x.challenges()[0].encryptedEmail, undefined);
  });
}

test('existing inactive contacts use legacy DOI fallback, count once and complete only after Kit activates', async () => {
  const x = fixture('inactive');
  process.env.KIT_FORM_FICTION_ID = '102'; process.env.KIT_FORM_LAB_ID = '104';
  process.env.WELCOME_SERIES_ENABLED = 'true';
  await request();
  assert.match(String(x.emails[0].TextBody), /Kit may send additional/);
  assert.deepEqual(x.writes(), []);
  const token = tokenFrom(x.emails[0]);
  const response = await claim(token);
  assert.equal(response.status, 200); assert.equal((await response.json()).status, 'awaiting-kit');
  assert.deepEqual(x.writes().map((c) => c.url), ['https://api.kit.com/v4/forms/102/subscribers/55', 'https://api.kit.com/v4/forms/104/subscribers/55']);
  assert.equal(x.emails.length, 1, 'no welcome until active');
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 0, kit_doi_fallback: 1 });
  assert.equal(x.challenges()[0].encryptedEmail, undefined);
  assert.equal(x.challenges()[0].signupFlow, 'legacy-fallback');
  assert.equal(x.awaiting.size, 1);
  assert.equal((await claim(token)).status, 200);
  assert.equal(x.metrics.kit_doi_fallback, 1);
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).pending, 1);
  assert.equal(x.writes().length, 2);
  x.setState('active');
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).tagged, 2);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 1, kit_doi_fallback: 1 });
  assert.equal(x.awaiting.size, 0);
  assert.equal(x.emails.length, 2, 'one welcome after Kit activation');
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).checked, 0);
  assert.equal(x.emails.length, 2);
});

test('inactive fallback survives partial form failure and flag change without double-counting', async () => {
  const x = fixture('inactive'); process.env.KIT_FORM_FICTION_ID = '102'; process.env.KIT_FORM_LAB_ID = '104';
  await request(); const token = tokenFrom(x.emails[0]); x.failOneForm();
  assert.equal((await claim(token)).status, 502);
  assert.equal(x.challenges()[0].signupFlow, 'legacy-fallback');
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 0, kit_doi_fallback: 1 });
  process.env.KIT_DIRECT_ACTIVE_SIGNUP = 'false'; expireLease(x);
  assert.equal((await claim(token)).status, 200);
  assert.equal(x.challenges()[0].status, 'awaiting-kit');
  assert.equal(x.metrics.kit_doi_fallback, 1);
  assert.ok(x.writes().every((c) => c.method === 'POST' && c.url.includes('/forms/')));
});

test('partial tag retry stays direct when flag is later disabled and counts only the completed transition', async () => {
  const x = fixture(); await request(); x.failOneTag();
  const token = tokenFrom(x.emails[0]);
  assert.equal((await claim(token)).status, 502);
  assert.equal(x.challenges()[0].encryptedEmail, undefined);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 0, kit_doi_fallback: 0 });
  process.env.KIT_DIRECT_ACTIVE_SIGNUP = 'false'; expireLease(x);
  assert.equal((await claim(token)).status, 200);
  assert.equal(x.calls.some((c) => c.url.includes('/forms/')), false);
  assert.equal(x.writes().filter((c) => c.url.endsWith('/subscribers')).length, 1);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 1, kit_doi_fallback: 0 });
});

test('flag-off new signup remains inactive + DOI forms, then legacy cron drains it even with flag on', async () => {
  const x = fixture(); process.env.KIT_DIRECT_ACTIVE_SIGNUP = 'false';
  process.env.KIT_FORM_FICTION_ID = '102'; process.env.KIT_FORM_LAB_ID = '104';
  await request(); assert.deepEqual(x.writes(), []);
  assert.match(String(x.emails[0].TextBody), /Kit may send additional/);
  assert.equal((await claim(tokenFrom(x.emails[0]))).status, 200);
  assert.equal(x.challenges()[0].status, 'awaiting-kit');
  assert.equal(x.challenges()[0].signupFlow, undefined);
  assert.deepEqual(x.writes().map((c) => c.url), ['https://api.kit.com/v4/subscribers', 'https://api.kit.com/v4/forms/102/subscribers/55', 'https://api.kit.com/v4/forms/104/subscribers/55']);
  assert.equal(x.writes()[0].body?.state, 'inactive');
  process.env.KIT_DIRECT_ACTIVE_SIGNUP = 'true';
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).pending, 1);
  x.setState('active');
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).tagged, 2);
  assert.equal(x.awaiting.size, 0);
  assert.deepEqual(x.metrics, { first_party_verified: 1, kit_active_ready: 1, kit_doi_fallback: 0 });
});

test('cron removes a stale direct record from legacy index without a Kit read or tag', async () => {
  const x = fixture('active'); const id = 'a'.repeat(32);
  x.values.set(`writing:challenge:${id}`, JSON.stringify({ audiences: ['fiction'], subscriberId: 55, createdAt: Date.now(), verifiedAt: Date.now(), status: 'awaiting-kit', signupFlow: 'direct-active' }));
  x.awaiting.add(id);
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).checked, 0);
  assert.equal(x.calls.length, 0); assert.equal(x.awaiting.size, 0);
});

test('explicit cancellation and invalid confirmation tokens perform no Kit writes', async () => {
  const x = fixture(); await request();
  assert.equal((await claim('invalid')).status, 400);
  assert.equal((await claim(tokenFrom(x.emails[0]), 'cancel')).status, 200);
  assert.deepEqual(x.writes(), []); assert.equal(x.metrics.first_party_verified, 0);
});

test('direct confirm enrolls #434 series immediately, once across repeat signup, claim retries and cron', async () => {
  const x = fixture(); process.env.WELCOME_SERIES_ENABLED = 'true';
  await request(['fiction']);
  const token = tokenFrom(x.emails[0]);
  assert.equal((await claim(token)).status, 200);
  const digest = signupEmailDigest('reader@example.com');
  assert.equal(x.values.get(`writing:welcome:${digest}`), 'series:v1');
  const series = JSON.parse(x.values.get(`writing:welcome-series:${digest}`)!);
  assert.equal(series.step, 1); assert.equal(series.subscriberId, 55);
  assert.equal(series.encryptedEmail, undefined); assert.equal(series.email, undefined);
  assert.equal(x.emails.length, 2, 'one verification + first series email');
  if (provider === 'resend') assert.equal(x.mailRequests[1].headers.get('Idempotency-Key'), `welcome-series/${digest}/step-0`);
  assert.equal((await claim(token)).status, 200);
  await request(['lab']);
  assert.equal((await claim(tokenFrom(x.emails[2]))).status, 200);
  assert.equal(x.emails.length, 3, 'second verification, no second welcome');
  assert.equal((await reconcileVerifiedKitSignups({ apiKey: 'mock' })).checked, 0);
  assert.equal((await runDueWelcomeSeries({ apiKey: 'mock' })).checked, 0);
  assert.equal(x.emails.length, 3);
});

test('old processing records keep DOI semantics after flag activation', async () => {
  const x = fixture('inactive'); process.env.KIT_FORM_FICTION_ID = '102';
  const id = 'b'.repeat(32);
  x.values.set(`writing:challenge:${id}`, JSON.stringify({ audiences: ['fiction'], subscriberId: 55, createdAt: Date.now(), verifiedAt: Date.now(), status: 'processing', processingUntil: 0, processingToken: 'old', emailDigest: signupEmailDigest('reader@example.com') }));
  assert.equal((await claim(createVerificationToken(id, Date.now() + 60000))).status, 200);
  assert.equal(x.challenges()[0].status, 'awaiting-kit');
  assert.ok(x.writes().every((c) => c.url.includes('/forms/')));
});


test('selected-provider configuration is checked before any Kit, Redis or mail request', async () => {
  fixture();
  if (provider === 'resend') delete process.env.RESEND_API_KEY;
  else delete process.env.POSTMARK_SERVER_TOKEN;
  globalThis.fetch = async () => { assert.fail('No requests before selected-provider configuration passes'); };
  const response = await signup(new NextRequest('https://www.thearcades.me/api/subscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'reader@example.com', audiences: ['fiction'] }),
  }));
  assert.equal(response.status, 503);
});
