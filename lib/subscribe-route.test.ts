import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';

import { POST } from '@/app/(frontend)/api/subscribe/route';

const originalFetch = globalThis.fetch;

const TEST_ENV = {
  AC_API_URL: 'https://example.api-us1.com',
  AC_API_KEY: 'test-key',
  AC_LIST_ID_ALL_PERPOST: '7',
  AC_LIST_ID_FICTION_PERPOST: '9',
  AC_LIST_ID_ESSAYS_PERPOST: '10',
  AC_LIST_ID_LAB_PERPOST: '12',
} as const;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(TEST_ENV)) delete process.env[key];
});

test('subscribe route records Arcades Lab as an independent ActiveCampaign preference', async () => {
  for (const [key, value] of Object.entries(TEST_ENV)) process.env[key] = value;

  const listUpdates: Array<{ list: number; status: number }> = [];
  let contactId = 40;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/api/3/contact/sync')) {
      contactId += 1;
      return new Response(JSON.stringify({ contact: { id: String(contactId) } }), { status: 200 });
    }

    const body = JSON.parse(String(init?.body ?? '{}')) as {
      contactList: { list: number; status: number };
    };
    listUpdates.push({ list: body.contactList.list, status: body.contactList.status });
    return new Response(JSON.stringify({ contactList: { id: String(contactId) } }), { status: 201 });
  };

  const request = new NextRequest('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'reader@example.com',
      audiences: ['lab'],
      source: 'subscribe-page',
    }),
  });

  const response = await POST(request);
  const payload = (await response.json()) as { ok: boolean; subscribed: string[] };

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true, subscribed: ['lab'] });
  assert.deepEqual(
    listUpdates.sort((a, b) => a.list - b.list),
    [
      { list: 7, status: 2 },
      { list: 9, status: 2 },
      { list: 10, status: 2 },
      { list: 12, status: 1 },
    ],
  );
});

test('add mode subscribes selected audiences without changing existing preferences', async () => {
  for (const [key, value] of Object.entries(TEST_ENV)) process.env[key] = value;

  const listUpdates: Array<{ list: number; status: number }> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: '41' } }), { status: 200 });
    }
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      contactList: { list: number; status: number };
    };
    listUpdates.push({ list: body.contactList.list, status: body.contactList.status });
    return new Response(JSON.stringify({ contactList: { id: '41' } }), { status: 201 });
  };

  const request = new NextRequest('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'reader@example.com',
      audiences: ['fiction'],
      source: 'post-end',
      updateMode: 'add',
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.deepEqual(listUpdates, [{ list: 9, status: 1 }]);
});
