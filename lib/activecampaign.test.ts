import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  ActiveCampaignError,
  getAudienceListId,
  listActiveContactsForList,
  resolveActiveCampaignRecipientsForLists,
  resolveAudienceListIds,
  syncSubscriberToActiveCampaign,
} from './activecampaign';

function setAcEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    AC_API_URL: 'https://example.api-us1.com',
    AC_API_KEY: 'test-key',
    AC_NEWSLETTER_LIST_ID: '3',
    AC_LIST_ID_ALL_PERPOST: '7',
    AC_LIST_ID_FICTION_PERPOST: '9',
    AC_LIST_ID_ESSAYS_PERPOST: '10',
  };
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function clearAcEnv() {
  for (const k of [
    'AC_API_URL',
    'AC_API_KEY',
    'AC_NEWSLETTER_LIST_ID',
    'AC_LIST_ID_ALL_PERPOST',
    'AC_LIST_ID_FICTION_PERPOST',
    'AC_LIST_ID_ESSAYS_PERPOST',
    'ACTIVECAMPAIGN_API_URL',
    'ACTIVECAMPAIGN_API_KEY',
    'ACTIVECAMPAIGN_LIST_ID',
  ]) {
    delete process.env[k];
  }
}

function urlPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

afterEach(() => {
  clearAcEnv();
});

test('getAudienceListId reads per-post audience list env vars', () => {
  setAcEnv();

  assert.equal(getAudienceListId('all'), '7');
  assert.equal(getAudienceListId('fiction'), '9');
  assert.equal(getAudienceListId('essays'), '10');
});

test('resolveAudienceListIds targets all plus the category-specific list', () => {
  setAcEnv();

  assert.deepEqual(resolveAudienceListIds('fiction'), ['7', '9']);
  assert.deepEqual(resolveAudienceListIds('essay'), ['7', '10']);
  assert.deepEqual(resolveAudienceListIds(null), ['7', '10']);
});

test('listActiveContactsForList paginates and filters active list contacts', async () => {
  setAcEnv();
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = urlPath(input);
    urls.push(url);
    const parsed = new URL(url);
    const offset = parsed.searchParams.get('offset');
    assert.equal(parsed.searchParams.get('listid'), '7');
    assert.equal(parsed.searchParams.get('status'), '1');
    if (offset === '0') {
      return new Response(
        JSON.stringify({
          contacts: [
            { email: 'A@Example.com ' },
            { email: 'not-an-email' },
          ],
          meta: { total: '3' },
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        contacts: [{ email: 'b@example.com' }],
        meta: { total: '3' },
      }),
      { status: 200 },
    );
  };

  const emails = await listActiveContactsForList({ listId: '7', fetchImpl, limit: 2 });

  assert.deepEqual(emails, ['a@example.com', 'b@example.com']);
  assert.equal(urls.length, 2);
});

test('resolveActiveCampaignRecipientsForLists dedupes across lists', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(urlPath(input));
    const listId = url.searchParams.get('listid');
    const contacts =
      listId === '7'
        ? [{ email: 'same@example.com' }, { email: 'all@example.com' }]
        : [{ email: 'same@example.com' }, { email: 'fiction@example.com' }];
    return new Response(JSON.stringify({ contacts, meta: { total: contacts.length } }), {
      status: 200,
    });
  };

  const emails = await resolveActiveCampaignRecipientsForLists({
    listIds: ['7', '9'],
    fetchImpl,
  });

  assert.deepEqual(emails, ['all@example.com', 'fiction@example.com', 'same@example.com']);
});

test('listActiveContactsForList surfaces ActiveCampaign errors', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ message: 'bad list' }), { status: 404 });

  await assert.rejects(
    () => listActiveContactsForList({ listId: '7', fetchImpl }),
    (err) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('contacts lookup failed') &&
      err.causeStatus === 404,
  );
});

test('syncSubscriberToActiveCampaign upserts contact then subscribes to list', async () => {
  setAcEnv();
  const requests: Array<{ url: string; body: unknown }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = urlPath(input);
    requests.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: '42' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ contactList: { id: '99' } }), { status: 201 });
  };

  const result = await syncSubscriberToActiveCampaign({
    email: 'reader@example.com',
    listIdOverride: '9',
    fetchImpl,
  });

  assert.deepEqual(result, { contactId: '42' });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].body, { contact: { email: 'reader@example.com' } });
  assert.deepEqual(requests[1].body, {
    contactList: {
      list: 9,
      contact: 42,
      status: 1,
    },
  });
});

test('syncSubscriberToActiveCampaign forwards unsubscribe status', async () => {
  setAcEnv();
  const bodies: unknown[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')));
    const url = urlPath(input);
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: '42' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ contactList: { id: '99' } }), { status: 201 });
  };

  await syncSubscriberToActiveCampaign({
    email: 'reader@example.com',
    listIdOverride: '9',
    status: 2,
    fetchImpl,
  });

  assert.deepEqual(bodies[1], {
    contactList: {
      list: 9,
      contact: 42,
      status: 2,
    },
  });
});

test('syncSubscriberToActiveCampaign treats already-on-list 422 as success', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async (input) => {
    const url = urlPath(input);
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: '42' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ message: 'Contact is already subscribed' }), {
      status: 422,
    });
  };

  const result = await syncSubscriberToActiveCampaign({
    email: 'reader@example.com',
    listIdOverride: '9',
    fetchImpl,
  });

  assert.deepEqual(result, { contactId: '42' });
});
