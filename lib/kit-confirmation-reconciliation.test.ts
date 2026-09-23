import assert from 'node:assert/strict';
import test from 'node:test';

import { reconcileConfirmedKitSubscribers } from './kit-confirmation-reconciliation';

const audiences = [
  { audience: 'all' as const, formId: '9953083', tagId: '23851250' },
  { audience: 'fiction' as const, formId: '9953090', tagId: '23851251' },
  { audience: 'essays' as const, formId: '9953099', tagId: '23851252' },
  { audience: 'lab' as const, formId: '9953112', tagId: '23851253' },
];

test('reconciliation reads every form and tag before idempotently tagging active members', async () => {
  const calls: Array<{ url: URL; method: string }> = [];
  let writeStarted = false;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    if (method === 'POST') {
      writeStarted = true;
      return Response.json({ subscriber: { id: Number(url.pathname.split('/').at(-1)) } });
    }
    assert.equal(writeStarted, false, 'provider reads complete before tag writes begin');
    if (url.pathname === '/v4/forms/9953083/subscribers' && !url.searchParams.has('after')) {
      return Response.json({
        subscribers: [{ id: 11, state: 'active' }],
        pagination: { has_next_page: true, end_cursor: 'next-page' },
      });
    }
    if (url.pathname === '/v4/forms/9953083/subscribers') {
      return Response.json({ subscribers: [{ id: 13, state: 'active' }], pagination: { has_next_page: false } });
    }
    if (url.pathname.startsWith('/v4/forms/')) {
      const formId = url.pathname.split('/')[3];
      const member = formId === '9953090' ? 21 : formId === '9953099' ? 31 : 41;
      return Response.json({ subscribers: [{ id: member, state: 'active' }], pagination: { has_next_page: false } });
    }
    if (url.pathname === '/v4/tags/23851250/subscribers') {
      return Response.json({ subscribers: [{ id: 13, state: 'cancelled' }], pagination: { has_next_page: false } });
    }
    if (url.pathname.startsWith('/v4/tags/') && url.pathname.endsWith('/subscribers')) {
      return Response.json({ subscribers: [], pagination: { has_next_page: false } });
    }
    throw new Error(`Unexpected Kit request: ${method} ${url.pathname}`);
  };

  const result = await reconcileConfirmedKitSubscribers({ apiKey: 'test-key', audiences }, fetcher);
  assert.deepEqual(result, { confirmed: 5, alreadyTagged: 1, added: 4, failed: 0 });
  const writes = calls.filter(({ method }) => method === 'POST');
  assert.equal(writes.some(({ url }) => url.pathname.endsWith('/12')), false);
  assert.equal(writes.some(({ url }) => url.pathname.endsWith('/13')), false);
  assert.equal(writes.length, 4);
  assert.equal(calls.some(({ url }) => url.pathname === '/v4/forms/9953083/subscribers' && url.searchParams.get('status') !== 'active'), false);
  assert.equal(calls.some(({ url }) => url.pathname === '/v4/tags/23851250/subscribers' && url.searchParams.get('status') !== 'all'), false);
});

test('any incomplete Kit read fails before any audience tag write', async () => {
  let writes = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === 'POST') writes += 1;
    if (url.pathname === '/v4/forms/9953099/subscribers') return new Response(null, { status: 503 });
    if (url.pathname.startsWith('/v4/forms/')) {
      return Response.json({ subscribers: [], pagination: { has_next_page: false } });
    }
    if (url.pathname.startsWith('/v4/tags/')) {
      return Response.json({ subscribers: [], pagination: { has_next_page: false } });
    }
    throw new Error('Unexpected endpoint');
  };
  await assert.rejects(
    reconcileConfirmedKitSubscribers({ apiKey: 'test-key', audiences }, fetcher),
    /Kit subscriber lookup failed/,
  );
  assert.equal(writes, 0);
});
