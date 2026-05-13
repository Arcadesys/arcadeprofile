import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  ActiveCampaignError,
  formatCampaignSendDate,
  sendBlogPostNewsletter,
  syncSubscriberToActiveCampaign,
} from './activecampaign';

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
    'ACTIVECAMPAIGN_API_URL',
    'ACTIVECAMPAIGN_API_KEY',
    'ACTIVECAMPAIGN_LIST_ID',
    'POSTMARK_FROM_EMAIL',
  ]) {
    delete process.env[k];
  }
}

function urlPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function parseFormBody(init: RequestInit | undefined): URLSearchParams {
  return new URLSearchParams(String(init?.body ?? ''));
}

function emptyCampaignsResponse(): Response {
  return new Response(JSON.stringify({ campaigns: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function isCampaignsLookup(url: string): boolean {
  return url.includes('/api/3/campaigns?');
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
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      assert.match(url, /\/admin\/api\.php\?/);
      assert.match(url, /api_key=legacy-key/);
      const form = parseFormBody(init);
      assert.equal(form.get('fromemail'), 'from@example.com');
      assert.equal(form.get('p[9]'), '9');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '1' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      const form = parseFormBody(init);
      assert.equal(form.get('p[9]'), '9');
      assert.equal(form.get('m[1]'), '100');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '2' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
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

test('sendBlogPostNewsletter calls message_add then campaign_create with correct form fields and p[<id>] for the list', async () => {
  setAcEnv();

  const calls: string[] = [];
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      calls.push('message_add');
      assert.match(url, /\/admin\/api\.php\?/);
      assert.match(url, /api_key=test-key/);
      assert.match(url, /api_output=json/);
      // Brackets must reach AC unencoded — encoded form would land as the
      // literal key `p%5B3%5D` and AC would treat the array as empty.
      const rawBody = String(init?.body ?? '');
      assert.match(rawBody, /(?:^|&)p\[3\]=3(?:&|$)/);
      assert.doesNotMatch(rawBody, /%5B|%5D/);
      const form = parseFormBody(init);
      assert.equal(form.get('format'), 'html');
      assert.equal(form.get('subject'), 'Hello');
      assert.equal(form.get('html'), '<p>Body</p>');
      assert.equal(form.get('text'), 'Body');
      assert.equal(form.get('fromemail'), 'news@example.com');
      // 'editor' tells AC the html/text fields ARE the body. 'external' would
      // make AC try to fetch from an htmlfetch URL and surface "fetch:" in the email.
      assert.equal(form.get('htmlconstructor'), 'editor');
      assert.equal(form.get('textconstructor'), 'editor');
      assert.equal(form.get('p[3]'), '3');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '88' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      calls.push('campaign_create');
      assert.equal(init?.method, 'POST');
      const rawBody = String(init?.body ?? '');
      // Lists must be under p[<id>], NOT list[<id>] — that was the cause of
      // "You did not provide any lists." in earlier attempts.
      assert.match(rawBody, /(?:^|&)p\[3\]=3(?:&|$)/);
      assert.doesNotMatch(rawBody, /(?:^|&)list\[/);
      assert.match(rawBody, /(?:^|&)m\[88\]=100(?:&|$)/);
      assert.doesNotMatch(rawBody, /%5B|%5D/);
      const form = parseFormBody(init);
      assert.equal(form.get('type'), 'single');
      assert.equal(form.get('name'), 'Blog: my-post');
      assert.equal(form.get('status'), '1');
      assert.equal(form.get('p[3]'), '3');
      assert.equal(form.get('m[88]'), '100');
      const expectedAt = new Date(2030, 4, 1, 10, 0, 0);
      assert.equal(form.get('sdate'), formatCampaignSendDate(expectedAt));
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '900' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    assert.fail(`Unexpected fetch URL: ${url}`);
  };

  const result = await sendBlogPostNewsletter({
    subject: 'Hello',
    htmlBody: '<p>Body</p>',
    textBody: 'Body',
    slug: 'my-post',
    scheduledSendAt: new Date(2030, 4, 1, 10, 0, 0),
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.deepEqual(calls, ['message_add', 'campaign_create']);
  assert.equal(result.messageId, '88');
  assert.equal(result.campaignId, '900');
});

test('sendBlogPostNewsletter clamps past scheduledSendAt to now for the campaign sdate', async () => {
  setAcEnv();
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '9' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      const form = parseFormBody(init);
      const raw = form.get('sdate');
      if (!raw) {
        assert.fail('missing sdate');
      }
      const y = raw.slice(0, 4);
      const mo = raw.slice(5, 7);
      const d = raw.slice(8, 10);
      const h = raw.slice(11, 13);
      const min = raw.slice(14, 16);
      const s = raw.slice(17, 19);
      const asDate = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min), Number(s));
      const skew = Math.abs(asDate.getTime() - Date.now());
      assert.ok(
        skew < 3000,
        `expected sdate near now, got ${raw} (skew ${skew}ms)`,
      );
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '1' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 500 });
  };

  await sendBlogPostNewsletter({
    subject: 'A',
    htmlBody: 'b',
    textBody: 'b',
    slug: 't',
    scheduledSendAt: new Date(2000, 0, 1, 12, 0, 0),
    fetchImpl: fetchImpl as typeof fetch,
  });
});

test('sendBlogPostNewsletter throws when message_add returns HTTP error', async () => {
  setAcEnv();

  const fetchImpl: typeof fetch = async (input) => {
    if (isCampaignsLookup(urlPath(input))) return emptyCampaignsResponse();
    return new Response(
      JSON.stringify({ result_code: 0, result_message: 'Invalid sender' }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    );
  };

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
      err.message.includes('message_add failed') &&
      err.causeStatus === 422,
  );
});

test('sendBlogPostNewsletter throws when message_add returns result_code 0 with HTTP 200', async () => {
  setAcEnv();

  const fetchImpl: typeof fetch = async (input) => {
    if (isCampaignsLookup(urlPath(input))) return emptyCampaignsResponse();
    return new Response(
      JSON.stringify({ result_code: 0, result_message: 'Bad request' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

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
      err.message.includes('message_add failed') &&
      typeof err.details === 'string' &&
      err.details.includes('Bad request'),
  );
});

test('sendBlogPostNewsletter throws when campaign_create reports failure', async () => {
  setAcEnv();

  let step = 0;
  const fetchImpl = async (input: RequestInfo): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      step += 1;
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '5' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      step += 1;
      return new Response(
        JSON.stringify({ result_code: 0, result_message: 'List not found' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 500 });
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

  assert.equal(step, 2);
});

test('sendBlogPostNewsletter uses listIdOverride instead of AC_NEWSLETTER_LIST_ID when provided', async () => {
  setAcEnv({ AC_NEWSLETTER_LIST_ID: '999' });

  let messageListKey: string | null = null;
  let campaignListKey: string | null = null;
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      const form = parseFormBody(init);
      messageListKey = form.get('p[42]');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '11' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      const form = parseFormBody(init);
      campaignListKey = form.get('p[42]');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '7' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    assert.fail(`Unexpected fetch URL: ${url}`);
  };

  await sendBlogPostNewsletter({
    subject: 'X',
    htmlBody: 'b',
    textBody: 'b',
    slug: 'x',
    listIdOverride: '42',
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.equal(messageListKey, '42');
  assert.equal(campaignListKey, '42');
});

test('sendBlogPostNewsletter falls back to AC_NEWSLETTER_LIST_ID when listIdOverride is empty string', async () => {
  setAcEnv({ AC_NEWSLETTER_LIST_ID: '5' });

  let campaignListKey: string | null = null;
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '12' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      const form = parseFormBody(init);
      campaignListKey = form.get('p[5]');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '8' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    assert.fail(`Unexpected fetch URL: ${url}`);
  };

  await sendBlogPostNewsletter({
    subject: 'X',
    htmlBody: 'b',
    textBody: 'b',
    slug: 'x',
    listIdOverride: '   ',
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.equal(campaignListKey, '5');
});

test('sendBlogPostNewsletter throws when message_add response is not JSON', async () => {
  setAcEnv();

  const fetchImpl: typeof fetch = async (input) => {
    if (isCampaignsLookup(urlPath(input))) return emptyCampaignsResponse();
    return new Response('not-json', { status: 500 });
  };

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
      err.message.includes('message_add returned non-JSON'),
  );
});

test('sendBlogPostNewsletter short-circuits when a campaign with the same name already exists in AC', async () => {
  setAcEnv();

  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = urlPath(input);
    calls.push(url);
    if (isCampaignsLookup(url)) {
      return new Response(
        JSON.stringify({
          campaigns: [
            { id: '777', name: 'Blog: my-post', messageid: '321' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return assert.fail(`unexpected fetch when AC said campaign already exists: ${url}`);
  };

  const result = await sendBlogPostNewsletter({
    subject: 'Hello',
    htmlBody: '<p>Body</p>',
    textBody: 'Body',
    slug: 'my-post',
    fetchImpl,
  });

  // No message_add / campaign_create calls — only the lookup.
  assert.equal(calls.length, 1);
  assert.ok(isCampaignsLookup(calls[0]));
  assert.equal(result.campaignId, '777');
  assert.equal(result.messageId, '321');
});

test('sendBlogPostNewsletter campaigns lookup ignores AC responses whose name only partially matches', async () => {
  setAcEnv();

  let createdMessage = false;
  let createdCampaign = false;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) {
      // AC's `filters[name]` is a contains match — make sure we don't
      // mistakenly short-circuit when the exact name doesn't appear.
      return new Response(
        JSON.stringify({
          campaigns: [
            { id: '99', name: 'Blog: my-post (Fiction)', messageid: '11' },
            { id: '100', name: 'Blog: my-post-suffix', messageid: '12' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=message_add')) {
      createdMessage = true;
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '42' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      createdCampaign = true;
      const form = parseFormBody(init);
      assert.equal(form.get('name'), 'Blog: my-post');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '43' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    assert.fail(`unexpected URL ${url}`);
  };

  const result = await sendBlogPostNewsletter({
    subject: 'Hello',
    htmlBody: 'b',
    textBody: 'b',
    slug: 'my-post',
    fetchImpl,
  });

  assert.equal(createdMessage, true);
  assert.equal(createdCampaign, true);
  assert.equal(result.messageId, '42');
  assert.equal(result.campaignId, '43');
});

test('syncSubscriberToActiveCampaign upserts contact then subscribes to list', async () => {
  setAcEnv();

  const calls: Array<{ url: string; body: unknown }> = [];
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, body });
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(
        JSON.stringify({ contact: { id: 42 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.endsWith('/api/3/contactLists')) {
      return new Response(
        JSON.stringify({ contactList: { id: 1 } }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    }
    throw new Error(`unexpected url ${url}`);
  };

  const result = await syncSubscriberToActiveCampaign({
    email: 'reader@example.com',
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.equal(result.contactId, '42');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body, { contact: { email: 'reader@example.com' } });
  assert.deepEqual(calls[1].body, {
    contactList: { list: 3, contact: 42, status: 1 },
  });
});

test('syncSubscriberToActiveCampaign throws when contact/sync response missing id', async () => {
  setAcEnv();

  const fetchImpl = async (): Promise<Response> =>
    new Response(JSON.stringify({ contact: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  await assert.rejects(
    () => syncSubscriberToActiveCampaign({ email: 'x@y.com', fetchImpl }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('contact/sync response missing contact id'),
  );
});

test('syncSubscriberToActiveCampaign treats "already on list" 422 as success', async () => {
  setAcEnv();

  const fetchImpl = async (input: RequestInfo): Promise<Response> => {
    const url = urlPath(input);
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: 11 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        errors: [{ title: 'Contact is already a member of the list' }],
      }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await syncSubscriberToActiveCampaign({
    email: 'returning@example.com',
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.equal(result.contactId, '11');
});

test('syncSubscriberToActiveCampaign forwards status=2 (unsubscribe) on the contactLists POST', async () => {
  setAcEnv();

  let sentStatus: number | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = urlPath(input);
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: 7 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/api/3/contactLists')) {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      sentStatus = body?.contactList?.status;
      return new Response(JSON.stringify({ contactList: { id: 1 } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`unexpected url ${url}`);
  };

  await syncSubscriberToActiveCampaign({
    email: 'reader@example.com',
    status: 2,
    fetchImpl,
  });

  assert.equal(sentStatus, 2);
});

test('syncSubscriberToActiveCampaign surfaces contactLists failure', async () => {
  setAcEnv();

  const fetchImpl = async (input: RequestInfo): Promise<Response> => {
    const url = urlPath(input);
    if (url.endsWith('/api/3/contact/sync')) {
      return new Response(JSON.stringify({ contact: { id: 7 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ errors: [{ title: 'list missing', detail: 'no list 3' }] }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    );
  };

  await assert.rejects(
    () => syncSubscriberToActiveCampaign({ email: 'x@y.com', fetchImpl: fetchImpl as typeof fetch }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('contactLists failed (422)') &&
      typeof err.details === 'string' &&
      err.details.includes('no list 3'),
  );
});
