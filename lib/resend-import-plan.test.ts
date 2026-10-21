import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResendImportRow, IMPORT_STATE, planResendImport } from './resend-import-plan';
const segment = '550e8400-e29b-41d4-a716-446655440001';

test('maps current Kit states without enabling suppressed or inactive addresses', () => {
  assert.deepEqual(IMPORT_STATE, { active: 'subscribed', inactive: 'skip', cancelled: 'unsubscribed', bounced: 'unsubscribed', complained: 'unsubscribed' });
  assert.deepEqual(planResendImport([
    { state: 'active', topics: ['fiction', 'essays'] }, { state: 'inactive', topics: ['fiction'] },
    { state: 'cancelled', topics: ['all'] }, { state: 'bounced', topics: ['work-ai'] },
    { state: 'complained', topics: ['th4f'] },
  ]), { states: { subscribed: 1, skip: 1, unsubscribed: 3 }, topics: { fiction: 2, essays: 1, all: 1, 'work-ai': 1, th4f: 1 } });
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

test('active imported All Writing or Essays preferences join the broadcast segment', async () => {
  for (const topic of ['all', 'essays']) {
    const calls: Array<{ url: string; method?: string; payload?: unknown }> = [];
    const result = await applyResendImportRow({ email: 'reader@example.test', state: 'active', topics: [topic] }, { [topic]: `${topic}-topic` }, segment, async (url, method, payload) => {
      calls.push({ url, method, payload });
      if (url.includes('/suppressions/')) return null;
      if (url.endsWith('/contacts/reader%40example.test')) return null;
      if (url.endsWith('/contacts')) return { id: 'contact-id', unsubscribed: false };
      return { id: 'ok' };
    });
    assert.equal(result, 'subscribed');
    assert.ok(calls.some((call) => call.method === 'POST' && call.url.endsWith(`/segments/${segment}`)));
  }
});
