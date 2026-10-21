import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResendImportRow, backfillResendDefaultTopics, expandImportedTopics, IMPORT_STATE, planResendImport } from './resend-import-plan';
const segment = '550e8400-e29b-41d4-a716-446655440001';

test('maps current Kit states without enabling suppressed or inactive addresses', () => {
  assert.deepEqual(IMPORT_STATE, { active: 'subscribed', inactive: 'skip', cancelled: 'unsubscribed', bounced: 'unsubscribed', complained: 'unsubscribed' });
  assert.deepEqual(planResendImport([
    { state: 'active', topics: ['fiction', 'essays'] }, { state: 'active', topics: ['all'] }, { state: 'inactive', topics: ['fiction'] },
    { state: 'cancelled', topics: ['all'] }, { state: 'bounced', topics: ['work-ai'] },
    { state: 'complained', topics: ['th4f'] },
  ]), { states: { subscribed: 2, skip: 1, unsubscribed: 3 }, topics: { fiction: 2, essays: 2, all: 1 } });
});

test('active import refuses Resend suppression and never adds topics to an already-unsubscribed contact', async () => {
  const suppressedCalls: Array<{ url: string; method?: string }> = [];
  const bounced = await applyResendImportRow({ email: 'reader@example.test', state: 'active', topics: ['fiction'] }, { fiction: 'fiction-id' }, segment, async (url, method) => {
    suppressedCalls.push({ url, method });
    return url.includes('/suppressions/') ? { id: 'suppression-id' } : null;
  });
  assert.equal(bounced, 'skipped'); assert.equal(suppressedCalls.length, 1); assert.match(suppressedCalls[0].url, /suppressions/);

  const existingCalls: Array<{ url: string; method?: string }> = [];
  const existingUnsubscribe = await applyResendImportRow({ email: 'reader@example.test', state: 'active', topics: ['fiction'] }, { fiction: 'fiction-id' }, segment, async (url, method) => {
    existingCalls.push({ url, method });
    if (url.includes('/suppressions/')) return null;
    return { id: 'contact-id', email: 'reader@example.test', unsubscribed: true };
  });
  assert.equal(existingUnsubscribe, 'skipped'); assert.equal(existingCalls.length, 3); assert.deepEqual(existingCalls.map((call) => call.method), [undefined, undefined, 'DELETE']);
});

test('cancelled, bounced, and complained imports create globally suppressed contacts', async () => {
  for (const state of ['cancelled', 'bounced', 'complained']) {
    const calls: Array<{ url: string; method?: string; payload?: unknown }> = [];
    const result = await applyResendImportRow({ email: 'reader@example.test', state, topics: ['fiction'] }, { fiction: 'fiction-id' }, segment, async (url, method, payload) => {
      calls.push({ url, method, payload });
      if (url.endsWith('/contacts')) return { id: 'contact-id' };
      if (method === 'GET') return null;
      return { id: 'contact-id' };
    });
    assert.equal(result, 'suppressed');
    assert.deepEqual(calls.map((call) => call.method), [undefined, 'PATCH', 'DELETE']);
    assert.deepEqual(calls[1].payload, { unsubscribed: true });
  }
});

test('active imports use broad segment membership and expand All Writing to Fiction and Essays topic opt-ins', async () => {
  assert.deepEqual(expandImportedTopics(['all']), ['all', 'fiction', 'essays']);
  for (const [topic, topicIds, expected] of [
    ['all', { all: 'all-topic', fiction: 'fiction-topic', essays: 'essays-topic' }, ['all-topic', 'fiction-topic', 'essays-topic']],
    ['lab', { lab: 'lab-topic' }, ['lab-topic']],
  ] as const) {
    const calls: Array<{ url: string; method?: string; payload?: unknown }> = [];
    const result = await applyResendImportRow({ email: 'reader@example.test', state: 'active', topics: [topic] }, topicIds, segment, async (url, method, payload) => {
      calls.push({ url, method, payload });
      if (url.includes('/suppressions/')) return null;
      if (url.endsWith('/contacts/reader%40example.test')) return null;
      if (url.endsWith('/contacts')) return { id: 'contact-id', unsubscribed: false };
      return { id: 'ok' };
    });
    assert.equal(result, 'subscribed');
    assert.ok(calls.some((call) => call.method === 'POST' && call.url.endsWith(`/segments/${segment}`)));
    const topicUpdate = calls.find((call) => call.url.endsWith('/topics'))!;
    assert.deepEqual((topicUpdate.payload as Array<{ id: string }>).map(({ id }) => id), expected);
  }
});

test('active untagged imports opt into only All Writing, Fiction, and Essays', async () => {
  const row = { email: 'reader@example.test', state: 'active', topics: [] };
  assert.deepEqual(planResendImport([row]), { states: { subscribed: 1 }, topics: { all: 1, fiction: 1, essays: 1 } });
  const calls: Array<{ url: string; method?: string; payload?: unknown }> = [];
  await applyResendImportRow(row, { all: 'all-id', fiction: 'fiction-id', essays: 'essays-id', lab: 'lab-id', th4f: 'th4f-id' }, segment, async (url, method, payload) => {
    calls.push({ url, method, payload });
    if (url.includes('/suppressions/')) return null;
    if (url.endsWith('/contacts/reader%40example.test')) return null;
    if (url.endsWith('/contacts')) return { id: 'contact-id', unsubscribed: false };
    return {};
  });
  const optIns = calls.find((call) => call.url.endsWith('/topics'))!.payload as Array<{ id: string; subscription: string }>;
  assert.deepEqual(optIns, [
    { id: 'all-id', subscription: 'opt_in' },
    { id: 'fiction-id', subscription: 'opt_in' },
    { id: 'essays-id', subscription: 'opt_in' },
  ]);
});

test('default-topic backfill repairs active segment membership and only writes defaults for untagged contacts', async () => {
  const topicIds = { all: 'all-id', fiction: 'fiction-id', essays: 'essays-id' };
  const run = async (row: { email: string; state: string; topics: string[] }) => {
    const calls: Array<{ url: string; method?: string; payload?: unknown }> = [];
    const result = await backfillResendDefaultTopics(row, topicIds, segment, async (url, method, payload) => {
      calls.push({ url, method, payload });
      if (url.includes('/suppressions/')) return null;
      return { id: 'contact-id', unsubscribed: false };
    });
    return { result, calls };
  };
  const untagged = await run({ email: 'reader@example.test', state: 'active', topics: [] });
  assert.equal(untagged.result, 'backfilled');
  assert.ok(untagged.calls.some((call) => call.method === 'POST' && call.url.endsWith(`/segments/${segment}`)));
  assert.deepEqual((untagged.calls.find((call) => call.url.endsWith('/topics'))!.payload as Array<{ id: string }>).map((topic) => topic.id), ['all-id', 'fiction-id', 'essays-id']);

  const tagged = await run({ email: 'tagged@example.test', state: 'active', topics: ['lab'] });
  assert.equal(tagged.result, 'segment-repaired');
  assert.ok(tagged.calls.some((call) => call.method === 'POST' && call.url.endsWith(`/segments/${segment}`)));
  assert.ok(!tagged.calls.some((call) => call.url.endsWith('/topics')));
});

test('default-topic backfill never touches inactive, suppressed, missing, or globally unsubscribed contacts', async () => {
  const calls: Array<{ url: string; method?: string }> = [];
  const inactive = await backfillResendDefaultTopics({ email: 'inactive@example.test', state: 'inactive', topics: [] }, { all: 'a', fiction: 'f', essays: 'e' }, segment, async (url, method) => { calls.push({ url, method }); return null; });
  assert.equal(inactive, 'skipped'); assert.equal(calls.length, 0);
  const suppressed = await backfillResendDefaultTopics({ email: 'suppressed@example.test', state: 'active', topics: [] }, { all: 'a', fiction: 'f', essays: 'e' }, segment, async (url, method) => { calls.push({ url, method }); return url.includes('/suppressions/') ? { id: 'suppression' } : null; });
  assert.equal(suppressed, 'suppressed'); assert.equal(calls.length, 1);
  calls.length = 0;
  const unsubscribed = await backfillResendDefaultTopics({ email: 'unsubscribed@example.test', state: 'active', topics: [] }, { all: 'a', fiction: 'f', essays: 'e' }, segment, async (url, method) => { calls.push({ url, method }); if (url.includes('/suppressions/')) return null; return { id: 'contact-id', unsubscribed: true }; });
  assert.equal(unsubscribed, 'skipped'); assert.ok(!calls.some((call) => call.method === 'POST' || call.method === 'PATCH'));
});
