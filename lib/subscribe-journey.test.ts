import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as requestSignup } from '@/app/(frontend)/api/subscribe/route';
import { POST as confirmSignup } from '@/app/(frontend)/api/subscribe/verify/route';
import { reconcileVerifiedKitSignups } from './kit-confirmation-reconciliation';

const envNames = [
  'KIT_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SIGNUP_LINK_SECRET',
  'POSTMARK_SERVER_TOKEN', 'POSTMARK_FROM_EMAIL', 'WRITING_WELCOME_ENABLED',
  'KIT_TAG_ARCADEPROFILE_ID', 'KIT_FORM_FICTION_ID', 'KIT_TAG_FICTION_ID',
] as const;
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

function setupKitJourney(initialState: 'active' | 'inactive') {
  Object.assign(process.env, {
    KIT_API_KEY: 'kit-test', UPSTASH_REDIS_REST_URL: 'https://redis.example',
    UPSTASH_REDIS_REST_TOKEN: 'redis-test', SIGNUP_LINK_SECRET: 'a-long-signing-secret-for-tests-at-least-32',
    POSTMARK_SERVER_TOKEN: 'postmark-test', POSTMARK_FROM_EMAIL: 'writer@example.com',
    WRITING_WELCOME_ENABLED: 'false', KIT_TAG_ARCADEPROFILE_ID: '205',
    KIT_FORM_FICTION_ID: '102', KIT_TAG_FICTION_ID: '202',
  });
  const values = new Map<string, string>();
  const awaiting = new Set<string>();
  const kitWrites: string[] = [];
  const emails: Array<Record<string, unknown>> = [];
  let kitState = initialState;
  let subscriberExists = initialState === 'active';
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://redis.example') {
      const command = JSON.parse(String(init?.body)) as Array<string | number>;
      const key = String(command[1]);
      if (command[0] === 'SET') {
        if (command.includes('NX') && values.has(key)) return Response.json({ result: null });
        values.set(key, String(command[2]));
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'GET') return Response.json({ result: values.get(key) ?? null });
      if (command[0] === 'DEL') return Response.json({ result: values.delete(key) ? 1 : 0 });
      if (command[0] === 'SMEMBERS') return Response.json({ result: [...awaiting] });
      if (command[0] === 'SREM') { awaiting.delete(String(command[2])); return Response.json({ result: 1 }); }
      if (command[0] === 'EVAL') {
        if (command[2] === 1) {
          if (values.get(String(command[3])) === command[4]) values.delete(String(command[3]));
          return Response.json({ result: 1 });
        }
        const current = values.get(String(command[3]));
        if (!current) return Response.json({ result: 'missing' });
        const challenge = JSON.parse(current) as { status: string; processingToken?: string };
        if (challenge.status !== command[5]) return Response.json({ result: challenge.status });
        if (command[10] && challenge.processingToken !== command[10]) return Response.json({ result: 'lease_mismatch' });
        values.set(String(command[3]), String(command[6]));
        if (command[8] === 'awaiting-kit') awaiting.add(String(command[9]));
        else awaiting.delete(String(command[9]));
        return Response.json({ result: 'updated' });
      }
      throw new Error(`Unexpected Redis command ${String(command[0])}`);
    }
    if (url.startsWith('https://api.kit.com/v4/subscribers?')) {
      return Response.json({ subscribers: subscriberExists ? [{ id: 55, state: kitState, email_address: 'reader@example.com' }] : [] });
    }
    if (url === 'https://api.kit.com/v4/subscribers' && init?.method === 'POST') {
      subscriberExists = true;
      return Response.json({ subscriber: { id: 55, state: kitState, email_address: 'reader@example.com' } });
    }
    if (url === 'https://api.kit.com/v4/subscribers/55') {
      return Response.json({ subscriber: { id: 55, state: kitState, email_address: 'reader@example.com' } });
    }
    if (url.startsWith('https://api.kit.com/v4/forms/') || url.startsWith('https://api.kit.com/v4/tags/')) {
      kitWrites.push(url);
      return Response.json({ ok: true });
    }
    if (url === 'https://api.postmarkapp.com/email') {
      emails.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ ErrorCode: 0, MessageID: 'verification-1' });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  return {
    values, awaiting, kitWrites, emails,
    activate: () => { kitState = 'active'; },
  };
}

async function submitAndConfirm(audiences: string[]) {
  const signup = await requestSignup(new NextRequest('https://www.thearcades.me/api/subscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'Reader@Example.com', audiences, source: 'subscribe-page' }),
  }));
  assert.equal(signup.status, 200);
  return async (verificationText: string) => {
    const token = verificationText.match(/\/subscribe\/verify#([a-f0-9]{32}\.[^\s]+)/)?.[1];
    assert.ok(token, 'verification email contains a signed confirmation token');
    return confirmSignup(new Request('https://www.thearcades.me/api/subscribe/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, action: 'confirm' }),
    }));
  };
}

test('mixed Queer Columns and Work choices survive the email confirmation and reach only their Kit audiences', async () => {
  const kit = setupKitJourney('active');
  const confirm = await submitAndConfirm(['queer-columns', 'work-ai']);
  assert.deepEqual(kit.kitWrites, [], 'signup request alone makes no Kit changes');
  assert.equal(kit.emails.length, 1);
  assert.match(String(kit.emails[0].TextBody), /Queer Columns, Work \/ AI/);
  const response = await confirm(String(kit.emails[0].TextBody));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as { preferences: string[] }).preferences, ['Queer Columns', 'Work / AI']);
  assert.deepEqual(kit.kitWrites.sort(), [
    'https://api.kit.com/v4/forms/9954454/subscribers/55',
    'https://api.kit.com/v4/forms/9953061/subscribers/55',
    'https://api.kit.com/v4/tags/23866437/subscribers/55',
    'https://api.kit.com/v4/tags/23806915/subscribers/55',
    'https://api.kit.com/v4/tags/205/subscribers/55',
  ].sort());
  assert.equal(kit.emails.length, 1, 'no additional broadcast was sent');
});

test('new TH4F and Fiction signup waits for Kit activation before applying exactly the selected tags', async () => {
  const kit = setupKitJourney('inactive');
  const confirm = await submitAndConfirm(['th4f', 'fiction']);
  const response = await confirm(String(kit.emails[0].TextBody));
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { status: string }).status, 'awaiting-kit');
  assert.deepEqual(kit.kitWrites.sort(), [
    'https://api.kit.com/v4/forms/9953071/subscribers/55',
    'https://api.kit.com/v4/forms/102/subscribers/55',
  ].sort());
  assert.equal(kit.awaiting.size, 1);
  const pending = await reconcileVerifiedKitSignups({ apiKey: 'kit-test' });
  assert.equal(pending.pending, 1);
  assert.equal(kit.kitWrites.length, 2, 'inactive subscribers are not tagged');
  kit.activate();
  const result = await reconcileVerifiedKitSignups({ apiKey: 'kit-test' });
  assert.equal(result.failed, 0);
  assert.equal(result.tagged, 2);
  assert.deepEqual(kit.kitWrites.sort(), [
    'https://api.kit.com/v4/forms/9953071/subscribers/55',
    'https://api.kit.com/v4/forms/102/subscribers/55',
    'https://api.kit.com/v4/tags/23808390/subscribers/55',
    'https://api.kit.com/v4/tags/202/subscribers/55',
    'https://api.kit.com/v4/tags/205/subscribers/55',
  ].sort());
  assert.equal(kit.awaiting.size, 0);
  assert.equal(kit.emails.length, 1);
});
