import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureResendTopics } from './resend-topics';
import { RESEND_TOPICS } from './subscription-audiences';

test('ensures all shared topics with exact names and opt-out defaults, reusing existing IDs', async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); const method = init?.method ?? 'GET'; calls.push({ url, method, body: init?.body as string | undefined });
    if (method === 'GET') return Response.json({ data: [{ name: 'Fiction', id: 'existing-fiction-id', default_subscription: 'opt_out' }] });
    return Response.json({ id: `new-${JSON.parse(String(init?.body)).name}` });
  };
  const result = await ensureResendTopics('fixture', fetcher);
  assert.equal(result.RESEND_TOPIC_FICTION_ID, 'existing-fiction-id');
  assert.equal(Object.keys(result).length, RESEND_TOPICS.length);
  const creates = calls.filter((call) => call.method === 'POST').map((call) => JSON.parse(call.body ?? '{}'));
  assert.deepEqual(creates.map((body) => body.name), RESEND_TOPICS.filter((item) => item.name !== 'Fiction').map((item) => item.name));
  assert.ok(creates.every((body) => body.default_subscription === 'opt_out'));
  assert.ok(RESEND_TOPICS.some((item) => item.name === 'Work / AI'));
  assert.ok(RESEND_TOPICS.some((item) => item.name === 'TH4F'));
});

test('refuses to proceed when an existing topic does not default to opt-out', async () => {
  let createCalled = false;
  await assert.rejects(ensureResendTopics('fixture', async (_input, init) => {
    if (init?.method === 'POST') createCalled = true;
    return Response.json({ data: [{ name: 'All Writing', id: 'existing-all-id', default_subscription: 'opt_in' }] });
  }), /must have opt-out as its default subscription/);
  assert.equal(createCalled, false);
});
