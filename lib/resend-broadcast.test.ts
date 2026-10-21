import assert from 'node:assert/strict';
import test from 'node:test';
import { createAndScheduleResendBroadcast } from './resend-broadcast';

const input = {
  apiKey: 'fixture-full-key', from: 'Austen <austen@mail.example.test>', subject: 'Essay',
  html: '<p>Essay</p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>',
  description: 'Fixture', segmentIds: ['550e8400-e29b-41d4-a716-446655440001'],
  topicId: '550e8400-e29b-41d4-a716-446655440002', sendAt: '2026-10-22T12:00:00.000Z',
};

test('broadcast draft includes both broad segment and required topic scope before scheduling', async () => {
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  const result = await createAndScheduleResendBroadcast({ ...input, fetchImpl: async (url, init) => {
    calls.push({ url: String(url), method: init?.method, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
    return calls.length === 1 ? Response.json({ id: '550e8400-e29b-41d4-a716-446655440003' }, { status: 201 }) : Response.json({ id: '550e8400-e29b-41d4-a716-446655440003' });
  } });
  assert.equal(result.id, '550e8400-e29b-41d4-a716-446655440003');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body, {
    segment_id: input.segmentIds[0], topic_id: input.topicId, from: input.from,
    subject: input.subject, html: input.html,
  });
  assert.deepEqual(calls[1].body, { scheduled_at: input.sendAt });
});

test('broadcast refuses a missing topic before any provider request', async () => {
  let calls = 0;
  await assert.rejects(createAndScheduleResendBroadcast({ ...input, topicId: '', fetchImpl: async () => { calls += 1; return Response.json({}); } }), /Invalid Resend broadcast topic/);
  assert.equal(calls, 0);
});
