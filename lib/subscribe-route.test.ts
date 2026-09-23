import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '@/app/(frontend)/api/subscribe/route';

const names = ['KIT_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SIGNUP_LINK_SECRET', 'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'POSTMARK_FROM_NAME', 'POSTMARK_TRANSACTIONAL_STREAM'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
});
function configure() {
  process.env.KIT_API_KEY = 'kit-test';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test';
  process.env.SIGNUP_LINK_SECRET = 'test-secret-with-more-than-32-characters';
  process.env.POSTMARK_SERVER_TOKEN = 'postmark-test';
  process.env.POSTMARK_FROM_EMAIL = 'writer@example.com';
  process.env.POSTMARK_TRANSACTIONAL_STREAM = 'outbound';
}
function request(body: unknown) {
  return new NextRequest('https://example.com/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('signup stores an expiring challenge and sends one fragment-link email without Kit writes', async () => {
  configure();
  const kitWrites: string[] = [];
  let challenge: Record<string, unknown> | undefined;
  let postmark: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://api.kit.com/v4/subscribers?')) return Response.json({ subscribers: [] });
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      assert.equal(command[0], 'SET');
      if (String(command[1]).startsWith('writing:send-cooldown:')) return Response.json({ result: 'OK' });
      challenge = JSON.parse(command[2]) as Record<string, unknown>;
      return Response.json({ result: 'OK' });
    }
    if (url === 'https://api.postmarkapp.com/email') {
      postmark = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ ErrorCode: 0, Message: 'OK', MessageID: 'postmark-message-1' });
    }
    kitWrites.push(url);
    throw new Error(`Unexpected request ${url}`);
  };
  const response = await POST(request({ email: 'Reader@Example.com', audiences: ['fiction', 'lab', 'fiction'], source: 'subscribe-page' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { ok: boolean }).ok, true);
  assert.deepEqual(challenge?.audiences, ['fiction', 'lab']);
  assert.notEqual(challenge?.encryptedEmail, 'reader@example.com');
  assert.equal(typeof challenge?.encryptedEmail, 'string');
  assert.equal(challenge?.status, 'pending');
  assert.equal(postmark?.To, 'reader@example.com');
  assert.equal(postmark?.TrackLinks, 'None');
  assert.equal(postmark?.MessageStream, 'outbound');
  assert.match(String(postmark?.HtmlBody), /\/subscribe\/verify#[a-f0-9]{32}\./);
  assert.deepEqual(kitWrites, []);
});

test('suppressed Kit state receives no challenge, email, or writes', async () => {
  configure();
  let redisOrPostmark = false;
  globalThis.fetch = async (input) => {
    if (String(input).startsWith('https://api.kit.com/v4/subscribers?')) {
      return Response.json({ subscribers: [{ id: 99, state: 'complained', email_address: 'reader@example.com' }] });
    }
    redisOrPostmark = true;
    throw new Error('unexpected write');
  };
  const response = await POST(request({ email: 'reader@example.com', audiences: ['all'] }));
  assert.equal(response.status, 200);
  assert.equal(redisOrPostmark, false);
});

test('an ambiguous Postmark result keeps the challenge and cooldown and does not blindly resend', async () => {
  configure();
  let postmarkCalls = 0;
  let cooldownClaimed = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://api.kit.com/v4/subscribers?')) return Response.json({ subscribers: [] });
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      if (String(command[1]).startsWith('writing:send-cooldown:')) {
        if (cooldownClaimed) return Response.json({ result: null });
        cooldownClaimed = true;
      }
      return Response.json({ result: 'OK' });
    }
    if (url === 'https://api.postmarkapp.com/email') { postmarkCalls += 1; throw new Error('network timeout'); }
    throw new Error(`Unexpected request ${url}`);
  };
  const body = { email: 'reader@example.com', audiences: ['all'] };
  const first = await POST(request(body));
  assert.equal(first.status, 202);
  assert.equal((await first.json() as { deliveryPending: boolean }).deliveryPending, true);
  const second = await POST(request(body));
  assert.equal(second.status, 200);
  assert.equal(postmarkCalls, 1);
});

test('a definitive Postmark rejection releases cooldown so the reader can retry', async () => {
  configure();
  const commands: string[][] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://api.kit.com/v4/subscribers?')) return Response.json({ subscribers: [] });
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      commands.push(command);
      return Response.json({ result: 'OK' });
    }
    if (url === 'https://api.postmarkapp.com/email') return Response.json({ ErrorCode: 300, Message: 'Rejected' }, { status: 422 });
    throw new Error(`Unexpected request ${url}`);
  };
  const response = await POST(request({ email: 'reader@example.com', audiences: ['all'] }));
  assert.equal(response.status, 502);
  assert.ok(commands.some((command) => command[0] === 'DEL' && String(command[1]).startsWith('writing:send-cooldown:')));
  assert.ok(commands.some((command) => command[0] === 'DEL' && String(command[1]).startsWith('writing:challenge:')));
});

test('a malformed Postmark success receipt is treated as ambiguous and keeps the cooldown', async () => {
  configure();
  let deleteCooldown = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://api.kit.com/v4/subscribers?')) return Response.json({ subscribers: [] });
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as string[];
      if (command[0] === 'DEL' && String(command[1]).startsWith('writing:send-cooldown:')) deleteCooldown = true;
      return Response.json({ result: 'OK' });
    }
    if (url === 'https://api.postmarkapp.com/email') return Response.json({ ErrorCode: 0, Message: 'OK' });
    throw new Error(`Unexpected request ${url}`);
  };
  const response = await POST(request({ email: 'reader@example.com', audiences: ['all'] }));
  assert.equal(response.status, 202);
  assert.equal(deleteCooldown, false);
});
