import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { ActiveCampaignError, sendBlogPostNewsletter } from './activecampaign';

function setAcEnv(overrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    AC_API_URL: 'https://example.api-us1.com',
    AC_API_KEY: 'test-key',
    AC_NEWSLETTER_LIST_ID: '3',
    AC_NEWSLETTER_FROM_EMAIL: 'news@example.com',
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
    'AC_NEWSLETTER_FROM_EMAIL',
    'AC_NEWSLETTER_FROM_NAME',
    'AC_NEWSLETTER_REPLY_TO',
  ]) {
    delete process.env[k];
  }
}

afterEach(() => {
  clearAcEnv();
});

test('sendBlogPostNewsletter throws ActiveCampaignError when API base URL is missing', async () => {
  process.env.AC_API_KEY = 'x';
  process.env.AC_NEWSLETTER_LIST_ID = '1';
  process.env.AC_NEWSLETTER_FROM_EMAIL = 'a@b.co';

  await assert.rejects(
    () =>
      sendBlogPostNewsletter({
        subject: 'Hi',
        htmlBody: '<p>x</p>',
        textBody: 'x',
        slug: 'post',
        fetchImpl: async () => new Response('{}', { status: 200 }),
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('AC_API_URL') &&
      err.message.includes('ACTIVECAMPAIGN_API_URL'),
  );
});

test('sendBlogPostNewsletter accepts legacy ACTIVECAMPAIGN_* env names', async () => {
  delete process.env.AC_API_URL;
  delete process.env.AC_API_KEY;
  delete process.env.AC_NEWSLETTER_LIST_ID;
  delete process.env.AC_NEWSLETTER_FROM_EMAIL;
  process.env.ACTIVECAMPAIGN_API_URL = 'https://legacy.example.api-us1.com';
  process.env.ACTIVECAMPAIGN_API_KEY = 'legacy-key';
  process.env.ACTIVECAMPAIGN_LIST_ID = '9';
  process.env.POSTMARK_FROM_EMAIL = 'from@example.com';

  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/api/3/campaign')) {
      return new Response(JSON.stringify({ id: 2, name: 'Blog: post', type: 'single', canSplitContent: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/3/campaigns/2') && !url.includes('/edit')) {
      return new Response(
        JSON.stringify({ campaign: { message_id: '1', addressid: '0' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('/api/3/messages/1')) {
      assert.equal(init?.method, 'PUT');
      return new Response(JSON.stringify({ message: { id: '1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/3/campaigns/2/edit')) {
      assert.equal(init?.method, 'PUT');
      return new Response(JSON.stringify({ id: 2, scheduledDate: '2026-01-01 12:00:00' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    assert.fail(`Unexpected fetch URL: ${url}`);
  };

  const result = await sendBlogPostNewsletter({
    subject: 'Hi',
    htmlBody: '<p>x</p>',
    textBody: 'x',
    slug: 'post',
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.equal(result.messageId, '1');
  assert.equal(result.campaignId, '2');
});

test('sendBlogPostNewsletter succeeds after v3 campaign shell, message update, and schedule edit', async () => {
  setAcEnv();

  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/api/3/campaign')) {
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify({ id: 900, name: 'Blog: my-post', type: 'single', canSplitContent: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/3/campaigns/900')) {
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({ campaign: { message_id: '88', addressid: '2' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('/api/3/messages/88')) {
      assert.equal(init?.method, 'PUT');
      return new Response(JSON.stringify({ message: { id: '88' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/api/3/campaigns/900/edit')) {
      assert.equal(init?.method, 'PUT');
      const parsed = JSON.parse(String(init?.body)) as { listIds?: number[]; addressId?: number };
      assert.deepEqual(parsed.listIds, [3]);
      assert.equal(parsed.addressId, 2);
      return new Response(JSON.stringify({ id: 900, listIds: [3] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    assert.fail(`Unexpected fetch URL: ${url}`);
  };

  const result = await sendBlogPostNewsletter({
    subject: 'Hello',
    htmlBody: '<p>Body</p>',
    textBody: 'Body',
    slug: 'my-post',
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.equal(result.messageId, '88');
  assert.equal(result.campaignId, '900');
});

test('sendBlogPostNewsletter throws when v3 campaign create returns error status', async () => {
  setAcEnv();

  const fetchImpl = async (): Promise<Response> =>
    new Response(JSON.stringify({ errors: [{ title: 'Invalid' }] }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });

  await assert.rejects(
    () =>
      sendBlogPostNewsletter({
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        slug: 'x',
        fetchImpl,
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('campaign create failed') &&
      err.causeStatus === 422,
  );
});

test('sendBlogPostNewsletter throws when v3 campaign schedule reports failure', async () => {
  setAcEnv();

  let step = 0;
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/api/3/campaign')) {
      step += 1;
      return new Response(JSON.stringify({ id: 10, name: 'x', type: 'single', canSplitContent: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/3/campaigns/10')) {
      step += 1;
      return new Response(
        JSON.stringify({ campaign: { message_id: '5', addressid: '0' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('/api/3/messages/5')) {
      step += 1;
      assert.equal(init?.method, 'PUT');
      return new Response(JSON.stringify({ message: { id: '5' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'List not found' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  };

  await assert.rejects(
    () =>
      sendBlogPostNewsletter({
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        slug: 'x',
        fetchImpl: fetchImpl as typeof fetch,
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError && err.message.includes('campaign schedule failed'),
  );

  assert.equal(step, 3);
});

test('sendBlogPostNewsletter throws when v3 campaign create response is not JSON', async () => {
  setAcEnv();

  await assert.rejects(
    () =>
      sendBlogPostNewsletter({
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        slug: 'x',
        fetchImpl: async () => new Response('not-json', { status: 500 }),
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError && err.message.includes('non-JSON when creating campaign'),
  );
});
