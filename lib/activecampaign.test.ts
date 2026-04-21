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
    if (url.includes('/api/3/messages')) {
      return new Response(JSON.stringify({ message: { id: '1' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ result_code: 1, id: 2, result_message: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
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

test('sendBlogPostNewsletter succeeds after v3 message create and v1 campaign_create', async () => {
  setAcEnv();

  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/3/messages')) {
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify({ message: { id: '88' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/admin/api.php')) {
      assert.equal(init?.method, 'POST');
      return new Response(JSON.stringify({ result_code: 1, id: 900, result_message: 'Campaign saved' }), {
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

test('sendBlogPostNewsletter throws when v3 returns error status', async () => {
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
      err.message.includes('message create failed') &&
      err.causeStatus === 422,
  );
});

test('sendBlogPostNewsletter throws when v1 campaign_create reports failure', async () => {
  setAcEnv();

  let step = 0;
  const fetchImpl = async (input: RequestInfo): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/3/messages')) {
      step += 1;
      return new Response(JSON.stringify({ message: { id: '10' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ result_code: 0, result_message: 'List not found' }), {
      status: 200,
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
      err instanceof ActiveCampaignError && err.message.includes('campaign_create failed'),
  );

  assert.equal(step, 1);
});

test('sendBlogPostNewsletter throws when v3 response is not JSON', async () => {
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
      err instanceof ActiveCampaignError && err.message.includes('non-JSON when creating message'),
  );
});
