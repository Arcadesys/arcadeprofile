import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmResendContact, findResendContact, unsubscribeResendContact } from './resend-contacts';

const prior = Object.fromEntries(['RESEND_TOPIC_ALL_WRITING_ID','RESEND_TOPIC_FICTION_ID','RESEND_TOPIC_ESSAYS_ID','RESEND_TOPIC_LAB_ID','RESEND_TOPIC_QUEER_COLUMNS_ID','RESEND_TOPIC_WORK_AI_ID','RESEND_TOPIC_TH4F_ID'].map((key) => [key, process.env[key]]));
for (const [index, key] of Object.keys(prior).entries()) process.env[key] = `topic-${index}`;
test.after(() => { for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test('confirmation creates an opted-in contact and adds selected Resend topics only after explicit call', async () => {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); const method = init?.method ?? 'GET';
    calls.push({ url, method, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
    if (url.includes('/suppressions/')) return new Response('', { status: 404 });
    if (method === 'GET') return new Response('', { status: 404 });
    if (url.endsWith('/contacts')) return Response.json({ id: 'contact-12345678-1234-1234-1234-123456789012', email: 'reader@example.com', unsubscribed: false });
    return Response.json({ object: 'contact_topics', id: 'contact-12345678-1234-1234-1234-123456789012' });
  };
  const result = await confirmResendContact({ email: 'reader@example.com', audiences: ['fiction', 'queer-columns'], apiKey: 'fixture', fetcher });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'GET', 'POST', 'PATCH']);
  assert.deepEqual(calls[2].body, { email: 'reader@example.com', unsubscribed: false });
  assert.deepEqual(calls[3].body, [{ id: 'topic-1', subscription: 'opt_in' }, { id: 'topic-4', subscription: 'opt_in' }]);
});

test('an unsubscribed contact is never resubscribed or given topics', async () => {
  const calls: string[] = [];
  const result = await confirmResendContact({ email: 'reader@example.com', audiences: ['all'], apiKey: 'fixture', fetcher: async (input) => {
    calls.push(String(input));
    if (String(input).includes('/suppressions/')) return new Response('', { status: 404 });
    return Response.json({ id: 'contact-12345678-1234-1234-1234-123456789012', email: 'reader@example.com', unsubscribed: true });
  } });
  assert.deepEqual(result, { ok: false, suppressed: true });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url.includes('/suppressions/') || url.endsWith('/contacts/reader%40example.com')));
});

test('lookup is read-only and unsubscribe sets global suppression', async () => {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetcher: typeof fetch = async (input, init) => { calls.push({ url: String(input), method: init?.method ?? 'GET', ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) }); return Response.json({ id: 'contact-12345678-1234-1234-1234-123456789012', email: 'reader@example.com', unsubscribed: true }); };
  assert.equal((await findResendContact('reader@example.com', 'fixture', fetcher))?.unsubscribed, true);
  assert.equal(calls[0].method, 'GET');
  await unsubscribeResendContact('contact-12345678-1234-1234-1234-123456789012', 'fixture', fetcher);
  assert.deepEqual(calls[1].body, { unsubscribed: true });
});
