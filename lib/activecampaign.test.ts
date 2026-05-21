import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  ActiveCampaignError,
  createScheduledCampaign,
  formatCampaignSendDate,
  getCampaignStatus,
  isCampaignFrozen,
  syncSubscriberToActiveCampaign,
  updateCampaignSendDate,
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

test('createScheduledCampaign throws when AC_API_URL is missing', async () => {
  process.env.AC_API_KEY = 'x';
  process.env.AC_NEWSLETTER_FROM_EMAIL = 'a@b.co';

  await assert.rejects(
    () =>
      createScheduledCampaign({
        subject: 'Hi',
        htmlBody: '<p>x</p>',
        textBody: 'x',
        slug: 'post',
        listIds: ['3'],
        fetchImpl: async () => new Response('{}', { status: 200 }),
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('AC_API_URL'),
  );
});

test('createScheduledCampaign throws when listIds is empty', async () => {
  setAcEnv();
  await assert.rejects(
    () =>
      createScheduledCampaign({
        subject: 'x',
        htmlBody: 'x',
        textBody: 'x',
        slug: 'x',
        listIds: [],
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('at least one listId'),
  );
});

test('createScheduledCampaign accepts legacy ACTIVECAMPAIGN_* env names', async () => {
  delete process.env.AC_API_URL;
  delete process.env.AC_API_KEY;
  delete process.env.AC_NEWSLETTER_FROM_EMAIL;
  process.env.ACTIVECAMPAIGN_API_URL = 'https://legacy.example.api-us1.com';
  process.env.ACTIVECAMPAIGN_API_KEY = 'legacy-key';
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

  const result = await createScheduledCampaign({
    subject: 'Hi',
    htmlBody: '<p>x</p>',
    textBody: 'x',
    slug: 'post',
    listIds: ['9'],
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.equal(result.messageId, '1');
  assert.equal(result.campaignId, '2');
});

test('createScheduledCampaign emits a p[<id>] entry per list on message_add AND campaign_create', async () => {
  setAcEnv();

  const calls: string[] = [];
  const fetchImpl = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      calls.push('message_add');
      const rawBody = String(init?.body ?? '');
      assert.match(rawBody, /(?:^|&)p\[7\]=7(?:&|$)/);
      assert.match(rawBody, /(?:^|&)p\[10\]=10(?:&|$)/);
      assert.doesNotMatch(rawBody, /%5B|%5D/);
      const form = parseFormBody(init);
      assert.equal(form.get('subject'), 'Hello');
      assert.equal(form.get('html'), '<p>Body</p>');
      assert.equal(form.get('htmlconstructor'), 'editor');
      assert.equal(form.get('textconstructor'), 'editor');
      assert.equal(form.get('p[7]'), '7');
      assert.equal(form.get('p[10]'), '10');
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '88' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      calls.push('campaign_create');
      const rawBody = String(init?.body ?? '');
      assert.match(rawBody, /(?:^|&)p\[7\]=7(?:&|$)/);
      assert.match(rawBody, /(?:^|&)p\[10\]=10(?:&|$)/);
      assert.doesNotMatch(rawBody, /(?:^|&)list\[/);
      assert.match(rawBody, /(?:^|&)m\[88\]=100(?:&|$)/);
      const form = parseFormBody(init);
      assert.equal(form.get('type'), 'single');
      assert.equal(form.get('name'), 'Blog: my-post');
      assert.equal(form.get('status'), '1');
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

  const result = await createScheduledCampaign({
    subject: 'Hello',
    htmlBody: '<p>Body</p>',
    textBody: 'Body',
    slug: 'my-post',
    listIds: ['7', '10'],
    scheduledSendAt: new Date(2030, 4, 1, 10, 0, 0),
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.deepEqual(calls, ['message_add', 'campaign_create']);
  assert.equal(result.messageId, '88');
  assert.equal(result.campaignId, '900');
  assert.deepEqual(result.listIds, ['7', '10']);
});

test('createScheduledCampaign clamps past scheduledSendAt to now', async () => {
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
      if (!raw) assert.fail('missing sdate');
      const y = raw.slice(0, 4);
      const mo = raw.slice(5, 7);
      const d = raw.slice(8, 10);
      const h = raw.slice(11, 13);
      const min = raw.slice(14, 16);
      const s = raw.slice(17, 19);
      const asDate = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min), Number(s));
      assert.ok(Math.abs(asDate.getTime() - Date.now()) < 3000);
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '1' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 500 });
  };

  await createScheduledCampaign({
    subject: 'A',
    htmlBody: 'b',
    textBody: 'b',
    slug: 't',
    listIds: ['3'],
    scheduledSendAt: new Date(2000, 0, 1, 12, 0, 0),
    fetchImpl: fetchImpl as typeof fetch,
  });
});

test('createScheduledCampaign throws when message_add returns HTTP error', async () => {
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
      createScheduledCampaign({
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        slug: 'x',
        listIds: ['3'],
        fetchImpl,
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('message_add failed') &&
      err.causeStatus === 422,
  );
});

test('createScheduledCampaign throws when campaign_create reports failure', async () => {
  setAcEnv();
  const fetchImpl = async (input: RequestInfo): Promise<Response> => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) return emptyCampaignsResponse();
    if (url.includes('api_action=message_add')) {
      return new Response(
        JSON.stringify({ result_code: 1, result_message: 'ok', id: '5' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('api_action=campaign_create')) {
      return new Response(
        JSON.stringify({ result_code: 0, result_message: 'List not found' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 500 });
  };

  await assert.rejects(
    () =>
      createScheduledCampaign({
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        slug: 'x',
        listIds: ['3'],
        fetchImpl: fetchImpl as typeof fetch,
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError && err.message.includes('campaign_create failed'),
  );
});

test('createScheduledCampaign short-circuits when AC already has a campaign with the same name', async () => {
  setAcEnv();

  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = urlPath(input);
    calls.push(url);
    if (isCampaignsLookup(url)) {
      return new Response(
        JSON.stringify({
          campaigns: [{ id: '777', name: 'Blog: my-post', messageid: '321' }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return assert.fail(`unexpected fetch: ${url}`);
  };

  const result = await createScheduledCampaign({
    subject: 'Hello',
    htmlBody: '<p>Body</p>',
    textBody: 'Body',
    slug: 'my-post',
    listIds: ['3', '7'],
    fetchImpl,
  });

  assert.equal(calls.length, 1);
  assert.equal(result.campaignId, '777');
  assert.equal(result.messageId, '321');
});

test('createScheduledCampaign campaigns lookup ignores partial-name matches', async () => {
  setAcEnv();

  let createdCampaign = false;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = urlPath(input);
    if (isCampaignsLookup(url)) {
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

  const result = await createScheduledCampaign({
    subject: 'Hello',
    htmlBody: 'b',
    textBody: 'b',
    slug: 'my-post',
    listIds: ['3'],
    fetchImpl,
  });

  assert.equal(createdCampaign, true);
  assert.equal(result.messageId, '42');
  assert.equal(result.campaignId, '43');
});

test('updateCampaignSendDate sends v3 PUT with sdate ISO body', async () => {
  setAcEnv();

  const captured: { url: string; method: string; body: string; headers: Headers }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    captured.push({
      url: urlPath(input),
      method: String(init?.method ?? 'GET'),
      body: String(init?.body ?? ''),
      headers: new Headers(init?.headers),
    });
    return new Response(
      JSON.stringify({ campaign: { id: '777', sdate: '2030-06-01T19:00:00-00:00', status: '1' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const target = new Date(2030, 5, 1, 12, 0, 0);
  const result = await updateCampaignSendDate({
    campaignId: '777',
    scheduledSendAt: target,
    fetchImpl,
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].method, 'PUT');
  assert.match(captured[0].url, /\/api\/3\/campaigns\/777$/);
  assert.equal(captured[0].headers.get('Api-Token'), 'test-key');
  assert.equal(captured[0].headers.get('Content-Type'), 'application/json');
  const body = JSON.parse(captured[0].body) as { campaign?: { sdate?: string } };
  assert.equal(body.campaign?.sdate, target.toISOString());
  assert.equal(result.scheduledFor.getTime(), target.getTime());
});

test('updateCampaignSendDate clamps past dates to now', async () => {
  setAcEnv();

  let sdate = '';
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { campaign?: { sdate?: string } };
    sdate = body.campaign?.sdate ?? '';
    return new Response(
      JSON.stringify({ campaign: { id: '1', sdate, status: '1' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  await updateCampaignSendDate({
    campaignId: '1',
    scheduledSendAt: new Date(2000, 0, 1),
    fetchImpl,
  });

  const parsed = new Date(sdate);
  assert.ok(Math.abs(parsed.getTime() - Date.now()) < 3000);
});

test('updateCampaignSendDate throws when campaignId is empty', async () => {
  setAcEnv();
  await assert.rejects(
    () =>
      updateCampaignSendDate({
        campaignId: '   ',
        scheduledSendAt: new Date(),
        fetchImpl: async () => new Response('{}', { status: 200 }),
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('non-empty campaignId'),
  );
});

test('updateCampaignSendDate surfaces AC failure', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ errors: [{ title: 'Cannot reschedule sent campaign' }] }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  await assert.rejects(
    () =>
      updateCampaignSendDate({
        campaignId: '42',
        scheduledSendAt: new Date(2030, 0, 1),
        fetchImpl,
      }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('PUT campaigns/42 failed'),
  );
});

test('getCampaignStatus parses the campaign.status from v3 REST', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async (input) => {
    assert.match(urlPath(input), /\/api\/3\/campaigns\/42$/);
    return new Response(
      JSON.stringify({ campaign: { id: '42', status: '3' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const { status } = await getCampaignStatus({ campaignId: '42', fetchImpl });
  assert.equal(status, 3);
  assert.equal(isCampaignFrozen(status), true);
});

test('getCampaignStatus treats status >= 2 as frozen via isCampaignFrozen', () => {
  assert.equal(isCampaignFrozen(0), false);
  assert.equal(isCampaignFrozen(1), false);
  assert.equal(isCampaignFrozen(2), true);
  assert.equal(isCampaignFrozen(3), true);
  assert.equal(isCampaignFrozen(6), true);
});

test('getCampaignStatus throws on HTTP error', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ errors: [{ title: 'Not Found' }] }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    );
  await assert.rejects(
    () => getCampaignStatus({ campaignId: '9999', fetchImpl }),
    (err: unknown) =>
      err instanceof ActiveCampaignError && err.causeStatus === 404,
  );
});

test('getCampaignStatus throws on unrecognized status value', async () => {
  setAcEnv();
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({ campaign: { status: '99' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  await assert.rejects(
    () => getCampaignStatus({ campaignId: '1', fetchImpl }),
    (err: unknown) =>
      err instanceof ActiveCampaignError &&
      err.message.includes('unrecognized status'),
  );
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
